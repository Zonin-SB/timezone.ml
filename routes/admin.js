const express = require('express');
// const { response } = require('../app');
const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const adminHelpers = require('../helpers/admin-helpers');
// const { route } = require('./user');
const userHelpers = require('../helpers/user-helpers');
const excelJs = require("exceljs");
// const { Db } = require('mongodb');


let sessions;


const adminVerify = (req, res, next) => {
  // sessions=req.session
  if (req.session.adminLogin) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

router.get('/', adminVerify, async (req, res, next) => {
  const SalesReport = await adminHelpers.getMonthSalesReport();
  const ProductReport = await adminHelpers.getProductReport();
  const totalProducts = await adminHelpers.getTotalProducts();
  const totalOrders = await adminHelpers.getTotalOrders();


  let totalsales = 0;
  SalesReport.forEach((doc) => {
    totalsales += doc.totalSalesAmount
  })
  res.render('admin/dashboard', { admin: true, totalProducts, totalOrders, adminLogin: req.session.adminLogin, SalesReport, totalsales, ProductReport })
})

router.get('/login', (req, res) => {
  // sessions=req.session
  if (req.session.adminLogin) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { "loginError": req.session.loginError })
    req.session.loginError = false
  }
})

router.post('/login', (req, res) => {
  adminHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminLogin = true

      // sessions=req.session
      //  sessions.userId=req.body.username

      // console.log(sessions.userId)
      res.redirect('/admin')
    } else {
      console.log('admin login failed')
      req.session.loginError = "Invalid username or password"
      res.redirect('/admin/login')
    }
  })
})

/* GET products listing. */
router.get('/products', adminVerify, function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products });
  })


});
/* GET users listing. */
router.get('/users', adminVerify, (req, res) => {
  adminHelpers.getAllUsers().then((allUserDetails) => {
    res.render('admin/view-users', { allUserDetails, admin: true })
  })

})
// User Block/Unblock
router.get('/block/:id', adminVerify, (req, res) => {
  let proId = req.params.id
  adminHelpers.blockUser(proId).then((response) => {
    console.log(response)
    res.redirect('/admin/users')
  })
})

router.get('/unblock/:id', adminVerify, (req, res) => {
  let proId = req.params.id
  adminHelpers.unblockUser(proId).then((response) => {
    res.redirect('/admin/users')
  })
})
// add product
router.get('/add-product', adminVerify, (req, res) => {
  Promise.all([
    productHelpers.getAllCategory(),
    productHelpers.getAllSubCategory()
  ]).then((response) => {
    res.render('admin/add-product', { admin: true, category: response[0], subcategory: response[1] })
  })
})

router.post('/add-product', (req, res) => {
  console.log(req.body);
  console.log(req.files.Image);

  productHelpers.addProduct(req.body).then((response) => {
    let id = response.toString();

    let image1 = req.files.Image
    image1.mv('./public/product-images/' + id + '.jpg')

    let image2 = req.files.Image2
    image2.mv('./public/product-images2/' + id + '.jpg')

    let image3 = req.files.Image3
    image3.mv('./public/product-images3/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.redirect('/admin/products')
      } else {
        console.log(err);
      }
    })

    // let image = req.files.Image
    // image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
    //   if (!err) {
    //     res.redirect("/admin/products")
    //   } else {
    //     console.log(err)
    //   }
    // })


  })
})
// delete product
router.get('/delete-product/:id', adminVerify, (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/products');
  })
})

router.get('/edit-product/:id', (req, res) => {
  let proId = req.params.id
  Promise.all([
    productHelpers.getAllCategory(),
    productHelpers.getAllSubCategory(),
    productHelpers.getProductDetails(proId)
  ]).then((response) => {
    res.render('admin/edit-product', { admin: true, category: response[0], subcategory: response[1], product: response[2] })
  })
  // let product=productHelpers.getProductDetails(req.params.id)
  //console.log(product)

})

router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/products')
    try {

      if (req.files.Image) {
        let image1 = req.files.Image
        image1.mv('./public/product-images/' + id + '.jpg')
      }
      if (req.files.Image2) {
        let image2 = req.files.Image2
        image2.mv('./public/product-images2/' + id + '.jpg')
      }
      if (req.files.Image3) {
        let image3 = req.files.Image3
        image3.mv('./public/product-images3/' + id + '.jpg')
      }
    } catch {

    }

  })
})
// category management
router.get('/view-category', adminVerify, (req, res) => {
  productHelpers.getAllCategory().then((category) => {
    res.render('admin/view-category', { admin: true, category })
  })

})

router.get('/view-subcategory', adminVerify, (req, res) => {
  productHelpers.getAllSubCategory().then((subcategory) => {
    res.render('admin/view-subcategory', { admin: true, subcategory })
  })

})

router.get('/add-category', adminVerify, (req, res) => {
  res.render('admin/add-category', { admin: true })
})

router.get('/add-subcategory', adminVerify, (req, res) => {
  res.render('admin/add-subcategory', { admin: true })
})

router.post('/add-category', (req, res) => {
  productHelpers.addCategory(req.body).then((response) => {
    res.redirect('/admin/view-category')
  })
})

router.post('/add-subcategory', adminVerify, (req, res) => {
  productHelpers.addSubCategory(req.body).then((response) => {
    res.redirect('/admin/view-subcategory');
  })
})

//delete category
router.get('/delete-category/:id', (req, res) => {
  let id = req.params.id
  productHelpers.deleteCategory(id).then((response) => {
    console.log(response);
    res.redirect('/admin/view-category');
  })

})

router.get('/delete-subcategory/:id', (req, res) => {
  let id = req.params.id
  productHelpers.deleteSubCategory(id).then((response) => {
    console.log(response);
    res.redirect('/admin/view-subcategory');
  })
})


//order management
router.get('/orders', adminVerify, (req, res) => {
  adminHelpers.getAllOrders().then((allOrders) => {

    res.render('admin/view-orders', { admin: true, allOrders, adminLogin: req.session.adminLogin })
  })

})

router.get('/view-order-details/:id', adminVerify, async (req, res) => {
  orderId = req.params.id

  await userHelpers.getOrderedProducts(orderId).then((orderDetails) => {

    console.log(orderDetails)
    totalPrice = orderDetails[0].totalPrice,
      deliveryDetails = orderDetails[0].deliveryDetails,
      currentStatus = orderDetails[0].status,
      paymentMethod = orderDetails[0].paymentMethod.toUpperCase(),
      currentDate = orderDetails[0].date
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

    res.render('admin/view-order-details', { admin: true, orderDetails, totalPrice, deliveryDetails, currentStatus, paymentMethod, currentDate, paymentStatus })

  })
})

router.get('/cancelOrder/:id', (req, res) => {
  const orderId = req.params.id
  adminHelpers.cancelOrder(orderId).then((response) => {
    console.log(response)
    res.redirect('/admin/orders')
  })
})

// status changing
router.get('/statusPacking/:id', (req, res) => {
  console.log("Status changing to Packing")
  const orderId = req.params.id
  adminHelpers.statusPacking(orderId).then((response) => {
    console.log(response)
    res.redirect('/admin/orders')
  })
})

router.get('/statusShipped/:id', (req, res) => {
  console.log('Status changing to Shipped')
  const orderId = req.params.id
  adminHelpers.statusShipped(orderId).then((response) => {
    console.log(response)
    res.redirect('/admin/orders')
  })
})

router.get('/statusDelivered/:id', (req, res) => {
  console.log('Status changing to Delivered')
  const orderId = req.params.id
  adminHelpers.statusDelivered(orderId).then((response) => {
    console.log(response)
    res.redirect('/admin/orders')
  })
})

router.get('/sales-report', adminVerify, async (req, res) => {
  await adminHelpers.getTotalSalesReport().then((totalSalesReport) => {


    res.render('admin/sales-report', { admin: true, totalSalesReport })
  }).catch(() => {
    res.render('404')
  })

})

router.get('/exportExcel', async (req, res) => {
  let SalesReport = await adminHelpers.getTotalSalesReport();

  try {
    const workbook = new excelJs.Workbook();

    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "OrderID", key: "_id" },
      { header: "User", key: "name" },
      { header: "Date", key: "date" },
      { header: "Products", key: "products" },
      { header: "Method", key: "paymentMethod" },
      { header: "status", key: "status" },
      { header: "Amount", key: "totalPrice" },
    ];
    let counter = 1;
    SalesReport.forEach((report) => {
      report.s_no = counter;
      report.products = "";
      report.name = report.users[0].Name;
      report.product.forEach((eachProduct) => {
        report.products += eachProduct.Name + ",";
      });
      worksheet.addRow(report);
      counter++;
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });
    // console.log("finaly resolving the promic ")

    res.header(
      "Content-Type",
      "application/vnd.oppenxmlformats-officedocument.spreadsheatml.sheet"
    );
    res.header("Content-Disposition", "attachment; filename=report.xlsx");

    workbook.xlsx.write(res);
  } catch (err) {
    console.log(err.message);
  }
})

//offer management
router.get('/offer-management', adminVerify, async (req, res) => {
  // let offers=await adminHelpers.getAllOffers();
  res.render('admin/manage-offer', { admin: true })
})


//coupon management
router.get('/coupon-management', adminVerify, (req, res) => {
  adminHelpers.getAllCoupon().then((coupon) => {
    res.render('admin/manage-coupon', { admin: true, coupon })
  })

})

router.get('/add-coupon', adminVerify, (req, res) => {
  res.render('admin/add-coupon', { admin: true })
})

router.post('/add-coupon', (req, res) => {
  adminHelpers.addCoupon(req.body).then(() => {
    console.log('coupon added');

    res.redirect('/admin/coupon-management')
  }).catch((response) => {
    let message = response.message
    res.render('admin/add-coupon', { admin: true, message })
  })
})

router.get('/delete-coupon/:id', (req, res) => {
  const id = req.params.id
  adminHelpers.deleteCoupon(id).then((response) => {
    console.log(response);
    res.redirect('/admin/coupon-management')
  })
})


router.get('/edit-page', adminVerify, async (req, res) => {
  let carousel = await adminHelpers.getCarousel()

  res.render('admin/edit-page', { admin: true, carousel })
})

router.get('/add-carousel', (req, res) => {

  res.render('admin/add-carousel', { admin: true })
})

router.post('/add-carousel', (req, res) => {
  adminHelpers.addCarousel(req.body).then((response) => {
    const id = response.toString()
    if (req.files) {
      let image = req.files.image
      image.mv('./public/carousel-images/' + id + '.jpg')
    }
    res.redirect('/admin/edit-page')
  })
})

router.get('/delete-carousel/:id', (req, res) => {
  const id = req.params.id
  adminHelpers.deleteCarousel(id).then((response) => {
    res.redirect('/admin/edit-page')
  })
})



// admin logout
router.get('/logout', (req, res) => {
  // req.session.destroy();
  req.session.adminLogin = false
  res.redirect("/admin")
})


module.exports = router;
