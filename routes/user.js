const express = require('express');
// const { Db } = require('mongodb');
// const { response } = require('../app');
const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const paypal = require('paypal-rest-sdk');
const adminHelpers = require('../helpers/admin-helpers');



paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': "AVDJCIohOxoAPx2m9V8UiBUuRo7Rz6FNFXTTZmuB4HeWVu2pCZXcWaGj5jsCbdRpLeS32dvx9DwOjJN-",
  'client_secret': "EI8sAMkwQk-u8bT1IF3SAraD8cvpXu2nqvwtfBaqYHxGluPr5TMDV8jU-bf3_96Ka-9KKAKEoXPoKXiN"
});

const verifyLogin = (req, res, next) => {
  if (req.session.userLogin) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
  // let user = req.session.user
  // console.log(user);
  let cartCount = 0;
  let wishcount = 0;
  if (req.session.userLogin) {

    cartCount = await userHelpers.getCartCount(req.session.user._id)
    req.session.cartCount = cartCount;
    wishcount = await userHelpers.getWishlistCount(req.session.user._id)
    req.session.wishcount = wishcount;
  }
  let category = await adminHelpers.getMainCategory()
  let carousels = await adminHelpers.getCarousel()
  console.log(carousels);

  productHelpers.getTrendingProduct().then((products) => {
    res.render('user/view-products', { user: req.session.user, products, cartCount, wishcount, userLogin: req.session.userLogin, carousels, category });
  })

});

router.get('/login', (req, res) => {
  if (req.session.userLogin) {
    res.redirect('/')
  } else {
    res.render('user/login', { loginErr: req.session.loginErr, blocked: req.session.blocked })
    req.session.blocked = false
    req.session.loginErr = false

  }

})

router.get('/signup', (req, res) => {
  if (req.session.userLogin)
    res.redirect('/')
  else
    res.render('user/signup')
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {

    // console.log(response)
    if (response.emailFound) {

      res.render('user/signup', { eFound: true })
    } else {
      console.log(req.body);
      res.render('user/login')
    }

  })
})

router.post('/login', async (req, res) => {
  await userHelpers.doLogin(req.body).then((response) => {
    console.log("login response");
    console.log(response);
    if (response.blocked) {
      console.log(response.blocked);
      console.log('The user is blocked')
      req.session.blocked = true;
      res.redirect('/login')
    } else {
      if (response.status) {
        // req.session.loggedIn = true

        req.session.user = response.user

        // req.session.user.loggedIn = true
        req.session.Mobile = response.user.Mobile;
        res.redirect('/otp')
      } else {
        req.session.loginErr = true
        res.redirect('/login')
      }
    }
  })
})

// otp verification


router.get('/otp', (req, res) => {

  // hard setting for otp verification need to remove

  // req.session.userLogin = true

  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
  if (req.session.userLogin) {
    res.redirect('/')
  } else {
    userHelpers.sendOtp(req.session.Mobile)
    res.render('user/otp', { Mobile: req.session.Mobile, otpErr: req.session.otpErr })
    req.session.otpErr = false;
  }

})

router.post('/verifyOtp', (req, res) => {
  userHelpers.verifyOtp(req.body.otpval, req.session.Mobile).then((verify) => {
    console.log(verify);
    if (verify) {
      // req.session.user = response.user
      req.session.userLogin = true;
      console.log('otp verification success');
      res.redirect('/')
    } else {
      console.log('otp verification failed');
      req.session.otpErr = true
      res.redirect('/otp');
    }
  })
})

router.get('/resend', (req, res) => {
  res.redirect('/otp');
})

router.get('/view-allProducts', async (req, res) => {
  let cartCount = 0;
  let wishcount = 0;
  if (req.session.userLogin) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    req.session.cartCount = cartCount;
    wishcount = await userHelpers.getWishlistCount(req.session.user._id)
    req.session.wishcount = wishcount
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-allProducts', { products, cartCount, wishcount, userLogin: req.session.userLogin, user: req.session.user });
  })
})

router.get('/category-product-view', async (req, res) => {
  let category = req.query.category
  let cartCount = 0;
  let wishcount = 0;
  if (req.session.userLogin) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    req.session.cartCount = cartCount;
    wishcount = await userHelpers.getWishlistCount(req.session.user._id)
    req.session.wishcount = wishcount
  }

  productHelpers.getCategoryProduct(category).then((products) => {
    res.render('user/view-allProducts', { products, cartCount, wishcount, userLogin: req.session.userLogin, user: req.session.user });
  }).catch(async () => {

    res.render('user/view-allProducts', { notFound: true, cartCount, wishcount, userLogin: req.session.userLogin, user: req.session.user });
  })


})

router.get('/product-details/:id', async (req, res) => {

  const id = req.params.id
  if (req.session.userLogin) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    req.session.cartCount = cartCount;
    wishcount = await userHelpers.getWishlistCount(req.session.user._id)
    req.session.wishcount = wishcount
  }
  await productHelpers.getProductDetails(id).then((productDetails) => {
    res.render('user/expand-product', { user: req.session.user, productDetails, cartCount: req.session.cartCount, wishcount: req.session.wishcount, userLogin: req.session.userLogin })
  }).catch((err) => {
    console.log('Product details err' + err);
    res.render('404', { message: err.message })
  })

})

router.get('/wishlist', verifyLogin, async (req, res) => {
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  req.session.cartCount = cartCount
  wishcount = await userHelpers.getWishlistCount(req.session.user._id);
  req.session.wishcount = wishcount
  let wishlist = await userHelpers.getWishlistProducts(req.session.user._id)
  console.log('wishlist products');
  console.log(wishlist);
  res.render('user/wishlist', { user: req.session.user, userLogin: req.session.userLogin, cartCount: req.session.cartCount, wishlist, wishcount: req.session.wishcount })
})


//add to cart
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  // console.log(req.session.user)
  console.log('api call')
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    // res.redirect('/')
    res.json({ status: true })
  })
})

router.get('/add-to-wishlist/:id', verifyLogin, (req, res) => {
  console.log('wishlist api call');
  userHelpers.addToWishlist(req.params.id, req.session.user._id).then((response) => {
    console.log('wishlist response');
    console.log(response);
    res.json({ status: true })
  }).catch((err) => {
    res.json({ status: false })
  })
})

router.get('/cart', verifyLogin, async (req, res) => {
  let totalPrice = await userHelpers.getTotalAmount(req.session.user._id);
  req.session.totalPrice = totalPrice;
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  req.session.cartCount = cartCount;

  let cartProduct = await userHelpers.getCartProducts(req.session.user._id)

  //console.log(products)
  res.render('user/cart', { user: req.session.user, cartProduct, cartCount: req.session.cartCount, wishcount: req.session.wishcount, userLogin: req.session.userLogin, totalPrice: req.session.totalPrice })
})

router.post('/change-product-quantity', (req, res, next) => {
  console.log(req.body)
  userHelpers.changeProductQuantity(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/remove-product', (req, res, next) => {
  console.log(req.query);
  // console.log(req.query.cartId)
  // console.log(req.query.proId)
  userHelpers.removeProduct(req.query).then((response) => {
    res.redirect('/cart')
  })


})

router.get('/remove-wish-product', (req, res, next) => {
  console.log(req.query);
  // console.log(req.query.cartId)
  // console.log(req.query.proId)
  userHelpers.removeWishlistProduct(req.query).then((response) => {
    res.redirect('/wishlist')
  })


})

router.get('/place-order', verifyLogin, async (req, res) => {
  console.log('place order entered')
  let totalPrice = await userHelpers.getTotalAmount(req.session.user._id)
  req.session.totalPrice = totalPrice;
  let address = await userHelpers.getDefaultAddress(req.session.user._id)

  res.render('user/placeOrder', { userLogin: req.session.userLogin, cartCount: req.session.cartCount, totalPrice: req.session.totalPrice, user: req.session.user, address, wishcount: req.session.wishcount })
})


// checkout
router.post('/place-order', async (req, res) => {

  console.log('place order body');
  console.log(req.body);
  // get total price
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)

  let coupon = await adminHelpers.applyCoupon(req.body.code)
  console.log('coupon result');
  console.log(coupon);
  if (coupon.length >= 1) {
    totalPrice = parseInt(totalPrice) - parseInt(coupon[0].value)
  }

  console.log(totalPrice);
  // get product
  let products = await userHelpers.getCartProductList(req.body.userId)
  // pass form data ,totalprice,product details to place order
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['paymentMethod'] === 'cod') {
      res.json({ codSuccess: true })
    } else if (req.body['paymentMethod'] === 'razorpay') {
      userHelpers.generateRazorpay(orderId, totalPrice).then((order) => {
        console.log('razorpay response')
        console.log(order)
        res.json({ order, razorpay: true })
      })
    } else {
      console.log('paypal started')
      res.json({ paypal: true, totalPrice, orderId })
    }

  })
  // console.log(req.body)
})

router.post('/razor-verify-payment', (req, res) => {
  console.log('razorpay form details')
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(() => {
    currentStatus = 'Placed'
    userHelpers.changePaymentStatus(req.body['order[receipt]'], currentStatus).then(() => {
      console.log('payment success')
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err)
    currentStatus = 'Payment not completed'
    userHelpers.changePaymentStatus(req.body['order[receipt]'], currentStatus).then(() => {
      console.log('Payment failed')
      res.json({ status: false })
    })

  })
})

router.post('/paypal-payment', (req, res) => {

  console.log(req.body)
  let totalPrice = req.body.totalPrice
  req.session.totalPrice = totalPrice

  let orderId = req.body.orderId
  req.session.user.orderId = orderId
  console.log('paypal payment started')

  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal"
    },
    redirect_urls: {
      return_url: "http://localhost:3005/paypal-payment/success",
      cancel_url: "http://localhost:3005/paypal-payment/cancel"
    },
    transactions: [{
      item_list: {
        items: [{
          name: "Red Sox Hat",
          sku: "001",

          price: "" + totalPrice,
          currency: "USD",
          quantity: 1
        }]
      },
      amount: {
        currency: "USD",

        total: "" + totalPrice
      },
      description: "Hat for the best team ever"
    }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      console.log("Create Payment Response");
      console.log(payment);

      {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            res.json({ forwardLink: payment.links[i].href })

          }

        }
      }
    }
  });

})

router.get('/paypal-payment/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const orderId = req.session.user.orderId;
  const totalPrice = req.session.totalPrice


  const execute_payment_json = {
    payer_id: payerId,
    transactions: [{
      amount: {
        currency: "USD",
        total: "" + totalPrice
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log("payment final step");
      currentStatus = 'Placed'
      userHelpers.changePaymentStatus(orderId, currentStatus).then(() => {
        console.log('Payment success')
        res.render('user/orderSuccess', { user: req.session.user, cartCount: req.session.cartCount, userLogin: req.session.userLogin })
      })
    }
  });
})

router.get('/paypal-payment/cancel', (req, res) => {
  //  res.send('Payment cancelled')

  currentStatus = 'Payment not completed'
  const orderId = req.session.user.orderId
  userHelpers.changePaymentStatus(orderId, currentStatus).then(() => {
    console.log('Payment Cancelled')

    res.redirect('/orders')

    // res.render('user/view-orders')
    // res.json({status:false})
  })

})


router.get('/orderSuccess', verifyLogin, async (req, res) => {
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  req.session.cartCount = cartCount;
  res.render('user/orderSuccess', { userLogin: req.session.userLogin, cartCount: req.session.cartCount, user: req.session.user })
})

router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getAllOrders(req.session.user)
  res.render('user/view-orders', { user: req.session.user, userLogin: req.session.userLogin, cartCount: req.session.cartCount, orders, wishcount: req.session.wishcount })
})

router.get('/view-ordered-products/:id', verifyLogin, async (req, res) => {
  orderId = req.params.id

  await userHelpers.getOrderedProducts(orderId).then((orderDetails) => {

    console.log(orderDetails)
    totalPrice = orderDetails[0].totalPrice,
      deliveryDetails = orderDetails[0].deliveryDetails,
      currentStatus = orderDetails[0].status,
      paymentMethod = orderDetails[0].paymentMethod.toUpperCase(),
      currentDate = orderDetails[0].date;

    // paymentStatus = paymentMethod == 'COD' ? 'pending' : 'paid'

    if (paymentMethod == 'COD' && currentStatus == 'placed') {
      paymentStatus = 'pending'
    } else if (currentStatus == 'pending') {
      paymentStatus = 'pending'
    } else if (currentStatus == 'Payment not completed') {
      paymentStatus = 'Payment not completed'
    } else {
      paymentStatus = 'paid'
    }


    res.render('user/view-ordered-products', { user: req.session.user, userLogin: req.session.userLogin, cartCount: req.session.cartCount, orderDetails, totalPrice, deliveryDetails, currentStatus, paymentMethod, currentDate, paymentStatus, wishcount: req.session.wishcount })

  }).catch((err) => {
    res.render('404')
  })

})

router.get('/cancelOrder/:id', (req, res) => {
  const orderId = req.params.id
  userHelpers.cancelOrder(orderId).then((response) => {
    console.log(response)
    res.redirect('/orders')
  })
})

router.get('/returnOrder/:id', (req, res) => {
  const orderId = req.params.id
  userHelpers.returnOrder(orderId).then((response) => {
    console.log(response)
    res.redirect('/orders')
  })
})

//coupon-checking
router.post('/check-coupon', verifyLogin, (req, res) => {
  let code = req.body.code

  console.log(code)
  userHelpers.checkCoupon(code).then((data) => {
    // console.log(data);
    let value = data.value
    res.json({ value })
  }).catch(() => {
    res.json({ err: true })
  })
})

router.get('/profile', verifyLogin, async (req, res) => {

  let address = await userHelpers.getAllAddress(req.session.user._id)
  console.log(address);
  userHelpers.getuserDetails(req.session.user._id).then((userData) => {
    console.log(userData)
    res.render('user/view-profile', { user: req.session.user, userLogin: req.session.userLogin, userData: userData[0], cartCount: req.session.cartCount, address })


  })

})

router.get('/edit-profile', verifyLogin, (req, res) => {
  userHelpers.getuserDetails(req.session.user._id).then((userData) => {
    console.log(userData)
    res.render('user/edit-profile', { user: req.session.user, userLogin: req.session.userLogin, cartCount: req.session.cartCount, userData: userData[0] })
  })

})

router.post('/editProfile/:id', (req, res) => {
  const id = req.params.id
  userHelpers.editProfile(req.body, id).then((response) => {
    console.log(response)
    res.redirect('/profile')
  })
})

router.get('/add-address', verifyLogin, (req, res) => {
  res.render('user/add-address', { user: req.session.user, userLogin: req.session.userLogin, cartCount: req.session.cartCount })
})

router.post('/add-address', verifyLogin, (req, res) => {
  let user = req.session.user
  let details = req.body
  details.userId = user._id
  details.default = false
  console.log(details);
  userHelpers.addAddress(details).then((data) => {
    res.redirect('/profile')
  })
})

router.get('/update-address/:id', verifyLogin, (req, res) => {
  const addressId = req.params.id
  userHelpers.getUserAddress(addressId).then((userAddress) => {
    console.log('update address response');
    console.log(userAddress);
    res.render('user/update-address', { user: req.session.user, userAddress: userAddress[0], userLogin: req.session.userLogin })
  })

})

router.post('/update-address/:id', verifyLogin, (req, res) => {
  const addressId = req.params.id
  userHelpers.updateAddress(req.body, addressId).then((response) => {
    console.log(response);
    res.redirect('/profile')
  })

})

router.get('/defaultAddress/:id', verifyLogin, (req, res) => {
  let user = req.session.user
  let addId = req.params.id
  userHelpers.changeDefaultAddress(addId, user._id).then(() => {

    userHelpers.changeDefaultAddress1(addId).then(() => {

      res.redirect('/profile')
    })
  })

})

router.post('/search', (req, res) => {
  let search = req.body.search
  userHelpers.search(search).then((products) => {
    // console.log(products);
    let user = req.session.user
    let cartCount = req.session.cartCount
    res.render('user/view-allProducts', { products, user, cartCount, userLogin: req.session.userLogin, wishcount: req.session.wishcount })

  }).catch(async () => {
    let user = req.session.user
    let cartCount = req.session.cartCount
    res.render('user/view-allProducts', { notFound: true, user, cartCount, userLogin: req.session.userLogin, wishcount: req.session.wishcount })
  })


})





router.get('/logout', (req, res) => {
  //  req.session.destroy()
  req.session.userLogin = false
  res.redirect('/')
})

module.exports = router;
