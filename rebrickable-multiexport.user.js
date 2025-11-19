// ==UserScript==
// @name        Multi-Export for Rebrickable
// @description Download a ZIP archive of all your set- and partlists
// @version     3
// @match       https://rebrickable.com/users/*/setlists/*
// @match       https://rebrickable.com/users/*/partlists/*
// @match       https://rebrickable.com/users/*/lists/*
// @grant       unsafeWindow
// @run-at      document-end
// @author      Oleh Prypin
// @namespace   https://github.com/oprypin/userscripts/
// ==/UserScript==
/* global $:false */

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

  // Downloads a URL, attempts retries on some types of failures, throws an error on failure.
  async function fetchUrl(url) {
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
        throw error(message);
      }
      return [await resp.text(), resp];
    }
    throw error('Stopping retries');
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

      const [html, resp] = await fetchUrl(`https://rebrickable.com/my/${kindId}/`);

      if (username == null) {
        [, username] = new RegExp(`https://rebrickable\\.com/users/([^/ ]+)/${kindId}\\b`).exec(resp.url);
        print(`Username: "${username}"`);
      }

      if (kindId === 'lostparts') {
        if (!html.includes('have 0 lost parts')) {
          const [text] = await fetchUrl(`https://rebrickable.com/users/${username}/lostparts/parts/?format=rbpartscsv&_=${+date}`);

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

        const [text] = await fetchUrl(`https://rebrickable.com/users/${username}/${kindId}/${listId}/${itemsKind}/?format=rb${itemsKind}csv&_=${+date}`);

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
            const [html] = await fetchUrl(`https://rebrickable.com/mocs/${altsetNum}/`);
            [, invId] = new RegExp('"/inventory/([0-9]+)/').exec(html);
            name = parseHtml(new RegExp('<h1>MOC - (.+?)</h1>').exec(html)[1]).textContent;
          } else {
            const [html] = await fetchUrl(`https://rebrickable.com/sets/${altsetNum}/`);
            [, invId] = new RegExp('"/inventory/([0-9]+)/').exec(html);
            name = parseHtml(new RegExp('<h1>\\w{4} \\w{3} [^ ]+ - (.+?)</h1>').exec(html)[1]).textContent;
          }

          const [text] = await fetchUrl(`https://rebrickable.com/inventory/${invId}/parts/?format=rbpartscsv&_=${+new Date()}`);

          const filename = `rebrickable_parts_${altsetNum.toLowerCase()}_${getNameSlug(name)}.csv`;
          print(`Exporting "${name}" as "${filename}"...`);
          yield {filename, text, comment: name};
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

function downloadRebrickableListsAsZipWithModal(kinds, title) {
  document.querySelector('#page_modal .modal-title').textContent = `Download: ${title || ''}`;
  const modalBody = document.querySelector('#page_modal_body');
  modalBody.innerHTML = '';
  downloadRebrickableListsAsZip(kinds, (msg) => {
    modalBody.innerHTML += msg + '<br>';
  });
  $('#page_modal').modal();
}

function parseHtml(htmlContent) {
  return new DOMParser().parseFromString(htmlContent, 'text/html').documentElement;
}

function getNameSlug(name) {
  return name.replace(/[<>:"/\\|?* .]+/g, '_');
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

// If running the whole code snippet from the console, simply run the function directly:
if (typeof (unsafeWindow) === 'undefined')
  downloadRebrickableListsAsZipWithModal(['setlists', 'partlists', /* 'lists', */ 'lostparts']);

addButtonsToDownloadRebrickableLists();
