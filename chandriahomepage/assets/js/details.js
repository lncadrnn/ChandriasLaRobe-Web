import {
    onAuthStateChanged,
    auth,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion
} from "./sdk/chandrias-sdk.js";

// Import auto-logout functionality
import autoLogout from "./auto-logout.js";

$(document).ready(async function () {
  const productId = localStorage.getItem("selectedProductId");
  if (!productId) {
    alert("No product selected.");
    return;
  }

  const docRef = doc(chandriaDB, "products", productId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    // Image previews
    $('.frontImage').attr("src", data.frontImageUrl);
    $('.backImage').attr("src", data.backImageUrl);

    // Text and values
    $('#product-name').text(data.name);
    $('#product-price').text(`₱ ${data.price}`);
    $('#product-description').text(data.description);
    $('#product-code').text(data.code);
    $('#product-color').css("background-color", data.color);

    // Sizes
    const sizeList = $('#product-sizes');
    sizeList.empty();
    $.each(data.size, function (size, qty) {
      sizeList.append(`<li><a href="#" class="size-link">${size}</a></li>`);
    });

    // Stock
    const totalStock = Object.values(data.size).reduce((a, b) => a + b, 0);
    $('#product-stock').text(`${totalStock} in stocks`);

  } else {
    alert("Product not found.");
  }
});