const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
form.addEventListener("submit", handleUploadedFile, false);

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const textArea = document.getElementById("pageids-textarea");
  const pageIDs = textArea.value
    .trim()
    .split(",")
    .map((pageID) => {
      return pageID.trim();
    });
  const library =
    inputElement.files && inputElement.files.length && inputElement.files[0];
  const fileName = library.name;
  document.getElementById("app").classList.add("loading");
  getXMLDoc(library).then((xml) => {
    if (xml && xml instanceof XMLDocument) {
      getPDAssets(pageIDs, xml, fileName);
    } else {
      addMessage(`File "${fileName}" can not be parsed.`, "error");
    }
  });
}

function getXMLDoc(inputFile) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = () => {
      fileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };
    fileReader.onload = () => {
      var fileText = fileReader.result;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(fileText, "text/xml");
      resolve(xmlDoc);
    };
    fileReader.readAsText(inputFile);
  });
}

function getAssetsByClasificationFolder(folderID, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='content']`;
  var assets = [];
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      assets.push(nextElement);
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    assets = nodes && nodes.toArray();
  }
  return assets.filter((asset) => isInFolder(asset, folderID));
}

function isInFolder(asset, folderID) {
  var classificationFolder = Array.from(
    asset.getElementsByTagName("classification-link")
  );
  var folders = Array.from(asset.getElementsByTagName("folder-link"));
  folders = classificationFolder.concat(folders);

  return !!folders.filter((node) => {
    return node.getAttribute("folder-id") === folderID;
  }).length;
}

function evaluateXpath(xpath, xml) {
  var result = [];
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      result.push(nextElement);
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    result = Array.from(nodes);
  }
  return result;
}

function getParentFolderId(folder) {
  var parentTag = Array.from(folder.getElementsByTagName("parent"))[0];
  return parentTag && parentTag.innerHTML;
}

function getSubFolders(folderId, xml) {
  var folders = evaluateXpath(
    "/*[local-name()='library']/*[local-name()='folder']",
    xml
  );

  console.log("test... ", Array.from(folders).length);

  return folders
    .filter((folder) => {
      console.log(getParentFolderId(folder));
      return getParentFolderId(folder) === folderId;
    })
    .map((folder) => {
      return folder.getAttribute("folder-id");
    });
}

function getAllFolderIds(folderIds, xml) {
  var allFolderIds = [];
  while (folderIds.length) {
    var currentFolderId = folderIds.pop();
    allFolderIds.push(currentFolderId);
    folderIds = folderIds.concat(getSubFolders(currentFolderId, xml));
  }
  return allFolderIds;
}

function getFolder(id, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='folder'][@folder-id="${id}"]`;
  var result;
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      result = nextElement;
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    result = nodes && nodes[0];
  }
  return result;
}

function getPDAssets(pageIDs, xml, fileName) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("library")[0];
  if (!libraryNode) {
    addMessage(
      `"library" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  library.innerHTML = "";
  let pageFound = true;

  pageIDs = getAllFolderIds(pageIDs, xml);

  pageIDs.forEach((pageID) => {
    var folder = getFolder(pageID, xml);
    library.appendChild(document.createTextNode("\n\n    "));
    library.appendChild(folder);
  });

  pageIDs.forEach((pageID) => {
    var assets = getAssetsByClasificationFolder(pageID, xml);
    assets.forEach((asset) => {
      library.appendChild(document.createTextNode("\n\n    "));
      library.appendChild(asset);
    });
  });
  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    download(fileName, xmlEncoding + library.outerHTML);
    addMessage(`Library xml is successfully filtered.`, "success");
  } else {
    addMessage("No pages found.", "error");
  }
  document.getElementById("app").classList.remove("loading");
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/xml;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.setAttribute("target", "_blank");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function addMessage(message, type) {
  var cssClass = "";
  switch (type) {
    case "error":
      cssClass = "error-msg";
      break;
    case "warning":
      cssClass = "warning-msg";
      break;
    case "info":
      cssClass = "info-msg";
      break;
    case "success":
      cssClass = "success-msg";
      break;
    default:
      cssClass = "success-msg";
      break;
  }
  var notification = document.createElement("div");
  notification.classList.add(cssClass);
  notification.innerHTML = message;
  document.getElementById("info-messages").appendChild(notification);
}
