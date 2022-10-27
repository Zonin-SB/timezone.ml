const db = require('../config/connection');
const collection = require('../config/collections');
const bcrypt = require('bcrypt');


// const { USER_COLLECTION } = require('../config/collections');
const collections = require('../config/collections');
// const { response } = require('../app');
const objectId = require('mongodb').ObjectId;

const accountSID = process.env.accountSID;
const serviceID = process.env.serviceID;
const authToken = process.env.authToken

const client = require("twilio")(accountSID, authToken);

//rasorpay
const Razorpay = require('razorpay');
const e = require('express');
const { resolve } = require('path');
const { log } = require('console');

var instance = new Razorpay({
    key_id: 'rzp_test_hjUdWI21GXdKXk',
    key_secret: 'tYHkdCTna6u1UljXAUV0pYBF',
});

module.exports = {

    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {

            let extEmail = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })

            if (extEmail == null) {

                userData.Password = await bcrypt.hash(userData.Password, 10)
                userData.Address = 'Not given'
                userData.blocked = false
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    // resolve(userData.insertedId)
                    resolve(data)
                })
            } else {

                resolve({ emailFound: true })
            }


        })

    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                if (user.blocked) {
                    response.blocked = true
                    resolve(response)
                } else {
                    bcrypt.compare(userData.Password, user.Password).then((status) => {
                        if (status) {
                            console.log('login success')
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            console.log('login failed')
                            resolve({ status: false })
                        }
                    })
                }

            } else {
                console.log('login failed')
                resolve({ status: false })
            }
        })

    },

    sendOtp: (Mobile) => {
        console.log('otp started sending');
        Mobile = "+91" + Mobile;
        console.log(Mobile);


        client.verify
            .services(serviceID)
            .verifications
            .create({
                to: Mobile,
                channel: 'sms',
            }).then((data) => {
                console.log('otp sent succesfully to ${Mobile}')
            })
    },

    verifyOtp: (otpval, Mobile) => {
        return new Promise(async (resolve, reject) => {
            Mobile = "+91" + Mobile
            console.log(Mobile)
            var OTP = otpval;
            var otpverify



            console.log(OTP);

            if (OTP.length == 6) {
                await client
                    .verify
                    .services(serviceID)
                    .verificationChecks
                    .create({
                        to: Mobile,
                        code: OTP
                    }).then((data) => {
                        console.log(data)
                        if (data.status == 'approved') {
                            otpverify = true;
                        } else {
                            otpverify = false;
                        }
                    })
            } else {

                otpverify = false;
            }
            console.log(otpverify);
            resolve(otpverify)
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }

        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {


                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }).then((response) => {
                                resolve()
                            })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },

    //wishlist
    addToWishlist: (proId, userId) => {
        var proObj = {
            item: objectId(proId),

        }

        return new Promise(async (resolve, reject) => {
            let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            console.log('addToWishlist userWishlist printing');
            console.log(userWishlist);
            if (userWishlist) {
                console.log('already have a wishlist');

                var proExist = userWishlist.products.findIndex(product => product.item == proId)
                console.log(proExist)
                if (proExist != -1) {
                    reject();
                } else {


                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }).then((response) => {
                                resolve(response)
                            })
                }
            } else {
                console.log('creating new wishlist');
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(cartObj).then((response) => {
                    console.log(cartObj);
                    resolve(response)
                })
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$products', 0] }
                    }
                }
            ]).toArray()
            // console.log(cartItems)
            resolve(cartItems)
        })
    },

    getWishlistProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlistItems = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, product: { $arrayElemAt: ['$products', 0] }
                    }
                }
            ]).toArray()
            // console.log(cartItems)
            resolve(wishlistItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },

    getWishlistCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (wishlist) {
                count = wishlist.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity: (details) => {
        count = parseInt(details.count)
        quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (count == -1 && quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': count }
                        }
                    ).then((response) => {
                        resolve(true)
                    })
            }

        })
    },

    removeProduct: (proData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(proData.cartId) },
                {
                    $pull: { products: { item: objectId(proData.proId) } }
                }).then((response) => {
                    resolve(response)
                })
        })
    },

    removeWishlistProduct: (proData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: objectId(proData.wishId) },
                {
                    $pull: { products: { item: objectId(proData.proId) } }
                }).then((response) => {
                    resolve(response)
                })
        })
    },

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {

            let proData = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$products', 0] }
                    }
                }
            ]).toArray()
            let total = 0
            grandTotal = 0;
            proData.forEach((x) => {
                total = (x.quantity) * (x.product.Price)
                //console.log(total)
                grandTotal += total

            })
            resolve(grandTotal)
        })

    },

    placeOrder: (order, products, totalPrice) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, totalPrice)
            let status = order.paymentMethod === 'cod' ? 'placed' : 'pending';


            // getting current time data
            let date_ob = new Date();
            let date = ("0" + date_ob.getDate()).slice(-2);
            let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
            let year = date_ob.getFullYear();
            let hours = date_ob.getHours();
            let AmOrPm = hours >= 12 ? 'pm' : 'am';
            hours = (hours % 12) || 12;
            let minutes = date_ob.getMinutes();

            // settig current time
            let currentTime = (year + "-" + month + "-" + date + " / " + hours + ":" + minutes + " " + AmOrPm);

            switch (month) {
                case "1": month = "Jan"
                    break;
                case "2": month = "Feb"
                    break;
                case "3": month = "Mar"
                    break;
                case "4": month = "Apr"
                    break;
                case "5": month = "May"
                    break;
                case "6": month = "Jun"
                    break;
                case "7": month = "Jul"
                    break;
                case "8": month = "Aug"
                    break;
                case "9": month = "Sep"
                    break;
                case "10": month = "Oct"
                    break;
                case "11": month = "Nov"
                    break;
                case "12": month = "Dec"
                    break;
                default: console.log("someting wrong")
            }
            console.log("the current moth is" + month)


            let orderObj = {
                deliveryDetails: {
                    name: order.Name,
                    phone: order.Mobile,
                    email: order.Email,
                    address: order.Address,
                    pincode: order.Pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order.paymentMethod,
                products: products,
                totalPrice: totalPrice,
                status: status,
                delivered: false,
                date: currentTime,
                currentDate: date_ob,
                currentMonth: month,

            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {

                // clearing the cart after the product checkout
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },

    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },

    getAllOrders: (user) => {
        return new Promise(async (resolve, reject) => {
            console.log(user)
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(user._id) }).sort(({ _id: -1 })).toArray()
            console.log(orders)
            resolve(orders)

        })
    },

    getOrderedProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {

            let orderDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        paymentMethod: 1,
                        totalPrice: 1,
                        date: 1,
                        status: 1,
                        deliveryDetails: 1,
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }, paymentMethod: 1, totalPrice: 1, deliveryDetails: 1, date: 1, status: 1
                    }
                }
            ]).toArray()

            resolve(orderDetails)
        })

    },

    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'Cancelled'
                }
            }).then(() => {
                resolve()
            })
        })
    },

    returnOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'Returned'
                }
            }).then(() => {
                resolve()
            })
        })
    },

    generateRazorpay: (orderId, totalPrice) => {
        return new Promise((resolve, reject) => {

            let options = {
                amount: totalPrice * 100,   // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            console.log("options" + options)
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("New order :", order)
                    resolve(order)
                }

            })

        })

    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'tYHkdCTna6u1UljXAUV0pYBF')

            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                console.log('matched')
                resolve()
            } else {
                console.log('not matched')
                reject()
            }
        })
    },

    changePaymentStatus: (orderId, currentStatus) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: currentStatus
                }
            }).then(() => {
                resolve()
            })
        })
    },

    getuserDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userDetails = await db.get().collection(collection.USER_COLLECTION).find({ _id: objectId(userId) }).toArray()
            resolve(userDetails)
        })
    },

    editProfile: (userData, userId) => {

        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    Name: userData.Name,
                    Email: userData.Email,
                    Mobile: userData.Mobile,

                }
            }).then((response) => {
                resolve(response.insertedId)
            })
        })
    },

    addAddress: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(details).then((response) => {
                resolve(response)
            }).catch((err) => {
                reject(err)
            })
        })
    },

    getAllAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: userId }).toArray()
            resolve(address)
        })
    },

    getUserAddress: (addressId) => {
        return new Promise(async (resolve, reject) => {
            let userAddress = await db.get().collection(collection.ADDRESS_COLLECTION).find({ _id: objectId(addressId) }).toArray()
            resolve(userAddress)
        })
    },

    updateAddress: (addressData, addressId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ _id: objectId(addressId) }, {
                $set: {
                    Name: addressData.Name,
                    Email: addressData.Email,
                    Mobile: addressData.Mobile,
                    Address: addressData.Address,
                    Pincode: addressData.Pincode
                }
            }).then((response) => {
                resolve()
            }).catch(() => {
                reject()
            })
        })
    },

    changeDefaultAddress: (addId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ userId: userId, default: true }, {
                $set: {
                    default: false
                }
            }).then((response) => {
                resolve()
            })
        })
    },

    changeDefaultAddress1: (addId) => {
        return new Promise((resolve, reject) => {
            try {

                db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ _id: objectId(addId) }, {
                    $set: {
                        default: true
                    }
                }).then((response) => {
                    resolve()
                })
            } catch {
                reject()
            }

        })
    },

    getDefaultAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: userId, default: true }).toArray()
            resolve(address[0])
        })
    },

    checkCoupon: (couponCode) => {
        return new Promise((resolve, reject) => {
            let coupon = db.get().collection(collection.COUPON_COLLECTION).findOne({ name: couponCode })
            if (coupon) {
                resolve(coupon)
            } else {
                reject()
            }
        })
    },

    search: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let product
                db.get().collection(collection.PRODUCT_COLLECTION).createIndex({ Name: 'text', Category: 'text', Brand: 'text' }).then((response) => {
                    new Promise(async (resolve, reject) => {
                        product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ $text: { $search: data } }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).toArray()
                        resolve(product)
                    }).then((product) => {
                        if (product == "") {
                            reject()
                        }
                        resolve(product)
                    })
                })
            } catch {
                response.status(400).send({ success: false })
                reject()
            }
        })
    }
}