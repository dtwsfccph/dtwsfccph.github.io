
const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
let allProducts = [];
const allProductIDs = [];
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

function getMaterProducts(productIDs, xml) {
  var xpath = `/*[local-name()='catalog']/*[local-name()='product']`;
  var products = evaluateXpath(xpath, xml);
  var masterProducts = [];
  var variantIDs = [];

  if (productIDs && productIDs.length && productIDs[0]) {
    console.log(productIDs, products.length);
    masterProducts = products.filter((node) => {
      return productIDs.includes(node.getAttribute("product-id"));
    });

    masterProducts.forEach(function (product) {
      Array.from(product.getElementsByTagName("variations") || []).forEach(
        (variation) => {
          Array.from(variation.getElementsByTagName("variants") || []).forEach(
            (variations) => {
              console.log("1222222222");
              Array.from(
                variations.getElementsByTagName("variant") || []
              ).forEach((variant) => {
                console.log("Variant", variant.getAttribute("product-id"));
                if (variant.getAttribute("product-id")) {
                  variantIDs.push(variant.getAttribute("product-id"));
                }
              });
            }
          );
        }
      );
    });
    console.log("variations", variantIDs);
    allProducts = masterProducts.concat(
      products.filter((node) => {
        return variantIDs.includes(node.getAttribute("product-id"));
      })
    );
  }
  return allProducts;
}

function getPDAssets(pageIDs, xml, fileName) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("catalog")[0];
  if (!libraryNode) {
    addMessage(
      `"catalog" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  library.innerHTML = "";
  let pageFound = true;

  var products = getMaterProducts(pageIDs, xml);

  products.forEach((product) => {
    library.appendChild(document.createTextNode("\n\n    "));
    library.appendChild(product);
  });

  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    download(fileName, xmlEncoding + library.outerHTML);
    addMessage(`Catalog xml is successfully filtered.`, "success");
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
