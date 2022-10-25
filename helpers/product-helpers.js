const db = require('../config/connection');
const collection = require('../config/collections');
// const { ObjectId } = require('mongodb');
const objectId = require('mongodb').ObjectId
// const { PRODUCT_COLLECTION } = require('../config/collections');
// const { response } = require('../app');

module.exports = {
    addProduct: (productdata) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.PRODUCT_COLLECTION).insertOne(productdata).then((response) => {
                resolve(response.insertedId)
            })
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            console.log(products);
            resolve(products)
        })
    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            console.log(proId);
            console.log(objectId(proId));
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                resolve()
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Brand:proDetails.Brand,
                    Price: proDetails.Price,
                    Description: proDetails.Description,
                    Stock: proDetails.Stock,
                    Category: proDetails.Category,
                    Subcategory: proDetails.Subcategory
                }
            }).then((response) => {
                resolve(response.insertedId)
            })
        })
    },

    addCategory: (categoryName) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(categoryName).then((response) => {
                resolve(response)
            })
        })
    },

    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category);
        })
    },
    addSubCategory: (subcategory) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.SUB_CATEGORY_COLLECTION).insertOne(subcategory).then((response) => {
                resolve(response);
            })
        })
    },

    getAllSubCategory: () => {
        return new Promise(async (resolve, reject) => {
            let subcategory = await db.get().collection(collection.SUB_CATEGORY_COLLECTION).find().toArray()
            resolve(subcategory);
        })
    },

    deleteCategory: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(id) }).then((response) => {
                resolve(response);
            })
        })
    },

    deleteSubCategory: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.SUB_CATEGORY_COLLECTION).deleteOne({ _id: objectId(id) }).then((response) => {
                resolve(response);
            })
        })
    },

     //for getting trending product
     getTrendingProduct:()=>{
        currentYear = new Date().getFullYear();
        return new Promise(async(resolve,reject)=>{
            const ProductReport=await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $match:{
                    currentDate:{
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:"$products.item",
                    quantity:"$products.quantity"
                }
            },
            {
                $group:{
                    _id:"$item",
                    totalSaledProduct:{$sum:"$quantity"}
                }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:"_id",
                    foreignField:"_id",
                    as:"product"
                }
            },
            {
                $unwind:"$product"
            }
        ]).sort({totalSaledProduct:-1}).limit(4).toArray()
        console.log(ProductReport);
        resolve(ProductReport)
        })
    },



    getCategoryProduct:(category)=>{
        return new Promise(async(resolve,reject)=>{
        await db.get().collection(collection.PRODUCT_COLLECTION).find({Category:category}).toArray().then((product)=>{
            console.log(product);
            resolve(product)
            }).catch(()=>{
                reject()
            })
            
        })
    }
}