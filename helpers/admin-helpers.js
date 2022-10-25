const db = require('../config/connection')
const collection = require('../config/collections')
// const { Db } = require('mongodb')
// const { ADMIN_COLLECTION } = require('../config/collections')
// const { response } = require('../app')
const objectId = require('mongodb').ObjectId

module.exports = {
    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let adminLoginStatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ username: adminData.username, password: adminData.password })
            if (admin) {
                console.log("login success");
                response.admin = admin
                response.status = true
                resolve(response)
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let allUserDetails = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            console.log(allUserDetails)
            resolve(allUserDetails)
        })
    },

    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { blocked: true } }).then((response) => {
                resolve(response)
            })
        })
    },
    unblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { blocked: false } }).then((response) => {
                resolve(response)
            })
        })
    },

    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let allOrders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'users'
                    }
                }

            ]).toArray()
            //  console.log(allOrders)
            resolve(allOrders)
        })
    },

    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "Cancelled by Seller"
                }
            }).then(() => {
                resolve()
            })
        })
    },

    statusPacking: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'Packing'
                }
            }).then(() => {
                resolve()
            })
        })
    },
    statusShipped: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'Shipped'
                }
            }).then(() => {
                resolve()
            })
        })
    },
    statusDelivered: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'Delivered',
                    delivered: true
                }
            }).then(() => {
                resolve()
            })
        })
    },

    getTotalProducts: () => {
        return new Promise(async (resolve, reject) => {
            const totalProduct = await db.get().collection(collection.PRODUCT_COLLECTION).count()
            resolve(totalProduct)
        })
    },

    getTotalOrders: () => {
        return new Promise(async (resolve, reject) => {
            const totalOrder = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(totalOrder)
        })
    },
    // for getting monthly sales report
    getMonthSalesReport: () => {
        currentYear = new Date().getFullYear();
        return new Promise(async (resolve, reject) => {
            const SalesReport = await db
                .get()
                .collection(collection.ORDER_COLLECTION)
                .aggregate([{
                    $match: {
                        currentDate: {
                            $gte: new Date(`${currentYear}-01-01`),
                            $lt: new Date(`${currentYear + 1}-01-01`)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$currentMonth',
                        totalSalesAmount: { $sum: "$totalPrice" },
                        count: { $sum: 1 }
                    }
                }
                ]).toArray();
            resolve(SalesReport)
        })
    },

    //for getting top selling products
    getProductReport: () => {
        currentYear = new Date().getFullYear();
        return new Promise(async (resolve, reject) => {
            const ProductReport = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $match: {
                    currentDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    item: "$products.item",
                    quantity: "$products.quantity"
                }
            },
            {
                $group: {
                    _id: "$item",
                    totalSaledProduct: { $sum: "$quantity" }
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $unwind: "$product"
            },
            {
                $project: {
                    name: "$product.Name",
                    totalSaledProduct: 1,
                    _id: 1
                }
            }
            ]).toArray()
            console.log(ProductReport);
            resolve(ProductReport)
        })
    },

    // Total Sales Report including all details
    getTotalSalesReport: () => {
        return new Promise(async (resolve, reject) => {
            let totalSalesReport = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $lookup: {
                    from: collection.USER_COLLECTION,
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'products.item',
                    foreignField: '_id',
                    as: "product"
                }
            }
            ]).toArray()

            console.log('total sales report');
            console.log(totalSalesReport);

            resolve(totalSalesReport)



        })
    },

    addCoupon: (couponData) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ name: couponData.name })

            if (coupon) {
                reject({ message: "coupon already exists" })
            } else {
                db.get().collection(collection.COUPON_COLLECTION).insertOne(couponData).then((response) => {
                    console.log(response);
                    resolve(response)
                })
            }
        })
    },

    getAllCoupon: () => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupon)
        })

    },

    deleteCoupon: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(couponId) }).then((response) => {
                resolve(response);
            })
        })
    },

    applyCoupon: (couponCode) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find({ name: couponCode }).toArray()
            resolve(coupon)
        })
    },

    addCarousel: (carouselData) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CAROUSEL_COLLECTION).insertOne(carouselData).then((response) => {
                console.log(response)
                resolve(response.insertedId)
            })
        })

    },

    getCarousel: () => {
        return new Promise(async (resolve, reject) => {
            let carousels = await db.get().collection(collection.CAROUSEL_COLLECTION).find().toArray()
            resolve(carousels)
        })
    },

    deleteCarousel: (carouselId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CAROUSEL_COLLECTION).deleteOne({ _id: objectId(carouselId) }).then((response) => {
                resolve(response)
            })
        })
    },

    getMainCategory: () => {
        return new Promise(async (resolve, reject) => {
            let mainCategory = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            console.log(mainCategory);
            resolve(mainCategory)
        })
    }




}