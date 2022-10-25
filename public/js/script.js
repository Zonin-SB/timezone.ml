// add to cart
function addToCart(proId) {
    console.log('cart ajax working');
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
            // alert(response)
        }
    })
}

// add to wishlist
function addToWishlist(proId) {
    console.log('wishlist ajax working');
    $.ajax({
        url: '/add-to-wishlist/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#wish-count').html()
                count = parseInt(count) + 1
                $('#wish-count').html(count)
            }
            // alert(response)
        }
    })
}

//showing numbets to table
var table_row = document.querySelectorAll("tbody > tr");

for (i in table_row) {
  let n = parseInt(i) + 1;
  var th = table_row[i].children[0];
  th.innerHTML = n;
}
