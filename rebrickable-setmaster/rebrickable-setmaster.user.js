// ==UserScript==
// @name        SetMaster for Rebrickable
// @description Export your collection and MOCs from Rebrickable to SetMaster
// @version     1.0
// @match       https://rebrickable.com/users/*/setlists/*
// @match       https://rebrickable.com/users/*/partlists/*
// @match       https://rebrickable.com/users/*/lists/*
// @match       https://rebrickable.com/mocs/MOC-*
// @match       https://rebrickable.com/sets/*
// @match       https://rebrickable.com/build/list/*
// @run-at      document-end
// @author      Oleh Prypin
// @namespace   https://github.com/oprypin/userscripts/
// ==/UserScript==

// `kinds` is a list of one or more of ['setlists', 'partlists', 'lists', 'lostparts'].
// `print` is an optional function that outputs a diagnostic line of text, instead of console.log.
async function downloadRebrickableListsAsZip(kinds, print) {
  'use strict';

  if (print == null)
    print = console.log;
  function error(msg) {
    print(`ERROR: ${msg}`);
    return new Error(msg);
  }

  // CRC32 implementation, based on https://stackoverflow.com/a/78344299
  const crc32Lookup = Uint32Array.from({length: 256}, (_, c) => {
    for (let i = 0; i < 8; i++)
      c = ((c & 1) * 0xedb88320) ^ (c >>> 1);
    return c;
  });
  function crc32(buf) {
    let crc = ~0;
    for (let i = 0; i < buf.byteLength; i++)
      crc = (crc >>> 8) ^ crc32Lookup[(crc ^ buf[i]) & 0xff];
    return ~crc >>> 0;
  }

  // Puts a series of N-byte integers into a single buffer.
  function pack(...dataPairs) {
    const totalSize = dataPairs.map((e) => e[0]).reduce((a, b) => a + b);
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    let offset = 0;
    for (const [size, byte] of dataPairs) {
      view[`setUint${size * 8}`](offset, byte, true);
      offset += size;
    }
    return buf;
  }

  // Creates a ZIP archive without any compression performed.
  // `filesStream` is an async stream of {filename, text, comment} objects.
  // Returns an array of buffers, which need be joined prior to being saved to a file.
  async function createZipArchive(filesStream) {
    const date = new Date();
    const dosDate = (date.getFullYear() - 1980 << 9) | (date.getMonth() + 1 << 5) | date.getDate();
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);

    const encoder = new TextEncoder();
    const result = [];
    let fileCount = 0;
    let offset = 0;
    function output(...datas) {
      for (const data of datas) {
        result.push(data);
        offset += data.byteLength;
      }
    }
    const fileHeaderDatas = [];
    for await (const {filename, text, comment} of filesStream) {
      fileCount += 1;
      const name = encoder.encode(filename);
      const data = encoder.encode(text);
      const cmmt = encoder.encode(comment);

      const fileHeaderEntry = [  // File header:
        [4, 0x02014b50],      // central file header signature
        [2, 831],             // version made by
        [2, 20],              // version needed to extract
        [2, 0],               // general purpose bit flag
        [2, 0],               // compression method
        [2, dosTime],         // last mod file time
        [2, dosDate],         // last mod file date
        [4, crc32(data)],     // crc-32
        [4, data.byteLength], // compressed size
        [4, data.byteLength], // uncompressed size
        [2, name.byteLength], // file name length
        [2, 0],               // extra field length
        [2, cmmt.byteLength], // file comment length
        [2, 0],               // disk number start
        [2, 0],               // internal file attributes
        [4, 0x81a40000],      // external file attributes
        [4, offset],          // relative offset of local header
      ];
      fileHeaderDatas.push([
        pack(...fileHeaderEntry),
        name,  // file name (variable size)
        cmmt,  // file comment (variable size)
      ]);

      output(
        pack(  // Local file header:
          [4, 0x04034b50],    // local file header signature
          [2, 14],            // version needed to extract
          ...fileHeaderEntry.slice(3, 12),
        ),
        name,  // file name (variable size)
        data,  // file data
      );
    }

    const centralDirOffset = offset;
    for (const datas of fileHeaderDatas)
      output(...datas);
    const centralDirSize = offset - centralDirOffset;
    output(pack(  // End of central directory:
      [4, 0x06054b50],        // end of central dir signature
      [2, 0],                 // number of this disk
      [2, 0],                 // number of the disk with the start of the central directory
      [2, fileCount],         // total number of entries in the central directory on this disk
      [2, fileCount],         // total number of entries in the central directory
      [4, centralDirSize],    // size of the central directory
      [4, centralDirOffset],  // offset of start of central directory
      [2, 0],                 // .ZIP file comment length
    ));
    return result;
  }

  // Note: `username` will be populated as a side effect of `fetchRebrickableLists`.
  let username = null;

  // Downloads all lists of the given kinds from Rebrickable,
  // yields their suggested file names and contents.
  // `kinds` is a list of one or more of ['setlists', 'partlists', 'lists', 'lostparts'].
  async function* fetchRebrickableLists(kinds) {
    const date = new Date();
    const exportedAltSets = [];
    for (const kindId of kinds) {
      const kindName = (kindId === 'lists' ? 'custom lists' : kindId);
      const itemsKind = (kindName === 'setlists' ? 'sets' : 'parts');

      const [html, resp] = await fetchUrl(`https://rebrickable.com/my/${kindId}/`, print);

      if (username == null) {
        [, username] = new RegExp(`https://rebrickable\\.com/users/([^/ ]+)/${kindId}\\b`).exec(resp.url);
        print(`Username: "${username}"`);
      }

      if (kindId === 'lostparts') {
        if (!html.includes('have 0 lost parts')) {
          const [text] = await fetchUrl(`https://rebrickable.com/users/${username}/lostparts/parts/?format=rbpartscsv&_=${+date}`, print);

          const filename = 'rebrickable_parts_lost-parts.csv';
          print(`Exporting lost parts as "${filename}"...`);
          yield {filename, text};
        }
        continue;
      }

      // Find how many lists this page claims to contain, so that this can be checked later.
      const match = (kindId === 'lists' ? /\b([0-9]+) out of [0-9]+ custom lists\b/i : /\binto ([0-9]+) lists?\b/i).exec(html);
      if (!match)
        throw error('Failed to detect the item count on the page.');
      const itemCount = parseInt(match[1]);
      print(`Found ${itemCount} ${kindName}.`);

      let currentListSuffix = null;
      const listsRe = new RegExp(`<a href="/users/[^/ ]+/${kindId}/([0-9]+)/?">\\s*([^<>]+?)(?:\\s* \\([0-9]+ ${itemsKind}?\\)|\n)\\s*</a>|<b>([A-Z][A-Za-z ]+)</b>`, 'g');
      for (let i = 0; i < itemCount; i += 1) {
        const match = listsRe.exec(html);
        if (!match)
          throw error(`Failed to find a sufficient number of ${kindName} on the page.`);

        if (match[3]) { // This is actually a custom list group/kind name, not a normal match.
          i -= 1;
          currentListSuffix = match[3].toLowerCase().replace(/ /g, '');
          continue;
        }

        const [, listId] = match;
        const listName = parseHtml(match[2]).textContent;
        const listSuffix = (kindId === 'lists'
          ? `custom_${currentListSuffix}`
          : (new RegExp(`data-url="/users/[^/ ]+/${kindId}/${listId}/setbuild/"\\s*>`).test(html) ? 'nobuild' : null)
        );
        const filename = [
          'rebrickable',
          itemsKind,
          listSuffix,
          listId,
          getNameSlug(listName),
        ].filter(Boolean).join('_') + '.csv';

        const [text] = await fetchUrl(`https://rebrickable.com/users/${username}/${kindId}/${listId}/${itemsKind}/?format=rb${itemsKind}csv&_=${+date}`, print);

        print(`Exporting "${listName}" as "${filename}"...`);
        yield {filename, text, comment: listName};

        // Setlists can contain MOCs and B-models!
        // They need to be exported because they're not in the database.
        if (kindId !== 'setlists')
          continue;
        for (let [, altsetNum] of text.matchAll(/^(MOC-[0-9]+|[^, ]+-1-b[0-9]+),/gm)){
          altsetNum = altsetNum.trim();
          if (exportedAltSets.includes(altsetNum))
            continue;
          exportedAltSets.push(altsetNum);

          let invId, name;
          if (altsetNum.startsWith('MOC-')) {
            const [html] = await fetchUrl(`https://rebrickable.com/mocs/${altsetNum}/`, print);
            [, invId] = new RegExp('"/inventory/([0-9]+)/').exec(html);
            name = parseHtml(new RegExp('<h1>MOC - (.+?)</h1>').exec(html)[1]).textContent;
          } else {
            const [html] = await fetchUrl(`https://rebrickable.com/sets/${altsetNum}/`, print);
            [, invId] = new RegExp('"/inventory/([0-9]+)/').exec(html);
            name = parseHtml(new RegExp('<h1>\\w{4} \\w{3} [^ ]+ - (.+?)</h1>').exec(html)[1]).textContent;
          }
          yield getAltSetContent({altsetNum, invId, name, print});
        }
      }
    }
  }

  // Initiates a browser download of an in-memory file.
  // `data` should be an array of buffers, which will be joined.
  function initiateDownload({data, filename}) {
    const blob = new Blob(data, {type: 'application/octet-stream'});
    const url = window.URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.style = 'display: none';
    el.href = url;
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    window.URL.revokeObjectURL(url);
  }

  const data = await createZipArchive(fetchRebrickableLists(kinds));

  const date = new Date();
  const dateStr = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0')).join('');
  const filename = `rebrickable_export_${username}_${dateStr}.zip`;

  print(`Saving ZIP archive "${filename}"...`);
  initiateDownload({data, filename});
  print('Success! The archive should be downloaded now.');
}

// Downloads a URL, attempts retries on some types of failures, throws an error on failure.
async function fetchUrl(url, print) {
  if (print == null)
    print = console.log;

  for (let i = 0; i < 3; i += 1) {
    print(`Fetching "${url}"...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      const message = `Response status ${resp.status} for ${url}`;
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 504)) {
        const delaySec = 30;
        print(message);
        print(`Waiting ${delaySec} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        continue;
      }
      print(`ERROR: ${message}`);
      throw new Error(message);
    }
    return [await resp.text(), resp];
  }
  print('Stopping retries');
  throw new Error('Stopping retries');
}

function downloadRebrickableListsAsZipWithModal(kinds, title) {
  const modalBody = showModal(`Download: ${title || ''}`);
  downloadRebrickableListsAsZip(kinds, (msg) => {
    modalBody.innerHTML += msg + '<br>';
  });
}

let dialog = null;

function showModal(title) {
  if (dialog == null) {
    dialog = parseHtml(`
    <dialog id="s_m_dialog" class="modal-dialog modal-lg" style="padding: 0; border: none">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" aria-label="Close">&times;</button>
          <h4 class="modal-title"></h4>
        </div>
        <div class="modal-body clearfix"></div>
      </div>
    </div>
    `).querySelector('dialog');
    document.querySelector('body').append(dialog);
    dialog.querySelector('button.close').onclick = () => dialog.close();
  }
  dialog.querySelector('.modal-title').textContent = title;
  dialog.querySelector('.modal-body').innerHTML = '';
  dialog.showModal();
  return dialog.querySelector('.modal-body');
}

function parseHtml(htmlContent) {
  return new DOMParser().parseFromString(htmlContent, 'text/html').documentElement;
}

function getNameSlug(name) {
  return name.replace(/[<>:"/\\|?* .]+/g, '_');
}

async function getAltSetContent({altsetNum, invId, name, print}) {
  if (print == null)
    print = console.log;
  const [text] = await fetchUrl(`https://rebrickable.com/inventory/${invId}/parts/?format=rbpartscsv&_=${+new Date()}`, print);

  const filename = `rebrickable_parts_${altsetNum.toLowerCase()}_${getNameSlug(name)}.csv`;
  print(`Exporting "${name}" as "${filename}"...`);
  return {filename, text, comment: name};
}

function addButtonToExportCurrentList() {
  const existingElement = (
    document.querySelector('.sidebar .sidebar_build_this') ||
    document.querySelector('#set_sidebar_top .sidebar_build_this') ||
    document.querySelector('a[href^="/build/list/"]')
  );
  if (existingElement == null)
    return;

  const newLink = parseHtml(`
  <a>
    <button class="btn ${existingElement.tagName === 'A' ? 'btn-default' : 'btn-primary btn-block'}">
      <i class="fa fa-cubes"></i> Build with SetMaster
    </button>
  </a>
  `).querySelector('a');

  const pageData = document.querySelector('#page_data');
  const listLink = document.querySelector('h3 a');
  if (pageData && pageData.getAttribute('data-set_num') && !/-b[0-9]+$/.test(pageData.getAttribute('data-set_num'))) {
    const setNum = pageData.getAttribute('data-set_num');
    const [invVer] = pageData.getAttribute('data-inv').split(' ');
    newLink.href = `https://setmaster.pryp.in/build/set/${setNum}:${invVer}`;
  } else if (listLink && listLink.parentElement.textContent.startsWith('Building ')) {
    const name = listLink.textContent;
    const [, username, listId] = new RegExp('/users/([^/]+)/lists/([0-9]+)/').exec(listLink.getAttribute('href'));

    newLink.onclick = async function () {
      let [text] = await fetchUrl(`https://rebrickable.com/users/${username}/lists/${listId}/parts/?format=rbpartscsv&inc_spares=0&_=${+new Date()}`);
      text = text.replaceAll('\r\n', '\n');
      const params = new URLSearchParams({'username': username, 'list_id': listId, 'name': name, 'content': text});
      window.location.href = `https://setmaster.pryp.in/build/?${params.toString()}`;
    };
  } else {
    function firstMatchInElement(elementId, elementAttr, regexp) {
      for (const el of document.querySelectorAll(`${elementId}[${elementAttr}]`)) {
        const match = regexp.exec(el.getAttribute(elementAttr));
        if (match)
          return match;
      }
      return null;
    }
    const [, invId] = firstMatchInElement('button', 'data-url', new RegExp('inv_id=([0-9]+)\\b'));
    const [, name] = firstMatchInElement('button', 'data-title', new RegExp('(.+)'));
    const altsetNum = document.querySelector('.breadcrumb .active').textContent.trim();

    newLink.onclick = async function () {
      let {text} = await getAltSetContent({altsetNum, invId, name});
      text = text.replaceAll('\r\n', '\n');
      // Drop the "Is Spare" column.
      const spareRe = /^([^,\n]+,[^,\n]+,[^,\n]+),Is Spare(?:,.+)?\n/;
      if (spareRe.test(text)) {
        text = text.replace(spareRe, '$1\n');
        text = text.replace(/(?:\n[^,\n]+,[^,\n]+,[^,\n]+,True|(\n[^,\n]+,[^,\n]+,[^,\n]+),False)(?:,.*)?$/gm, '$1');
      }
      const params = new URLSearchParams({'set_num': altsetNum, 'name': name, 'content': text});
      window.location.href = `https://setmaster.pryp.in/build/?${params.toString()}`;
    };
  }
  if (existingElement.elementId === 'a')
    existingElement.after(newLink);
  else
    existingElement.before(newLink);
}

function addButtonsToDownloadRebrickableLists() {
  const backupButton = document.querySelector('button[data-url$="/backup/"]');
  if (backupButton == null)
    return;
  const backupUrl = backupButton.getAttribute('data-url');

  const newBtnBlock = parseHtml(`
  <div class="btn-group btn-block">
    <button type="button" class="btn btn-default btn-block mt-6 dropdown-toggle" data-toggle="dropdown">
      <i class="fa fa-fw fa-cubes"></i> <span>Multi-Export (CSV Archive)</span> <span class="caret"></span>
    </button>
    <ul class="dropdown-menu" role="menu">
    </ul>
  </div>
  `).querySelector('div');

  const addMenuItem = function (title, kinds) {
    const newItem = document.createElement('li');
    newItem.innerHTML = `<a><i class="fa fa-fw fa-paste"></i> ${title}</a>`;
    newItem.querySelector('a').onclick = () => downloadRebrickableListsAsZipWithModal(kinds, title);
    newBtnBlock.querySelector('ul').append(newItem);
  };

  if (backupUrl.includes('/setlists/'))
    addMenuItem('All Setlists', ['setlists']);
  if (backupUrl.includes('/partlists/'))
    addMenuItem('All Partlists', ['partlists']);
  if (backupUrl.includes('/partlists/') || backupUrl.includes('/setlists/'))
    addMenuItem('All Setlists and Partlists', ['setlists', 'partlists', 'lostparts']);
  if (backupUrl.includes('/lists/'))
    addMenuItem('All Custom Lists', ['lists']);
  addMenuItem('All lists!', ['setlists', 'partlists', 'lists', 'lostparts']);

  backupButton.after(newBtnBlock);
}

addButtonsToDownloadRebrickableLists();
addButtonToExportCurrentList();
