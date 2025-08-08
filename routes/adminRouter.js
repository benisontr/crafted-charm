const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const { isLogin, isLogout } = require("../middleware/adminAuth");
const upload = require("../multer/multer");

adminRouter.get("/", isLogin, adminController.viewDashboard);
adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);
adminRouter.get("/add-category", isLogin, adminController.viewAddCategory);
adminRouter.get("/list-category", isLogin,  adminController.viewListCategory);
adminRouter.get("/edit-category", isLogin,  adminController.viewEditCategory);
adminRouter.get("/add-product", isLogin, adminController.viewAddProduct);
adminRouter.get("/list-product", isLogin,  adminController.viewListProduct);
adminRouter.get("/edit-product", isLogin,  adminController.viewEditProduct);
adminRouter.get("/product-details", isLogin, adminController.viewProductDetails);
adminRouter.get("/add-coupon", isLogin,  adminController.viewAddCoupon);
adminRouter.get("/list-coupon", isLogin, adminController.viewListCoupon);
adminRouter.get("/list-order", isLogin,  adminController.viewListOrder);
adminRouter.get("/order-details/:id", isLogin, adminController.viewOrderDetails);

adminRouter.get("/list-user", isLogin,  adminController.viewListUser);
adminRouter.get("/user-details", isLogin, adminController.viewUserDetails);
adminRouter.get("/inventory", isLogin,  adminController.viewInventory);
adminRouter.get("/sales-report", isLogin, adminController.viewSalesReport);
adminRouter.get("/home-editor", isLogin, adminController.viewHomeEditor);
adminRouter.get("/add-offers", isLogin, adminController.viewAddOffers);
adminRouter.get("/list-offers", isLogin, adminController.viewListOffers);
adminRouter.get("/order-tracking", isLogin,adminController.viewOrderTracking);
adminRouter.get("/view-return", isLogin, adminController.viewReturn);
adminRouter.get('/products/by-category/:categoryId', isLogin,adminController.viewProductsByCategory);
adminRouter.get("/edit-coupon", isLogin, adminController.viewEditCoupon);
adminRouter.get("/edit-offer", isLogin, adminController.viewEditOffer);
adminRouter.get("/view-review",isLogin,adminController.viewReview);
adminRouter.post('/delete-review/:id',isLogin,adminController.deleteReview);




adminRouter.delete("/delete-category/:id", isLogin, adminController.deleteCategory);
adminRouter.delete('/delete-product/:id', isLogin, adminController.deleteProduct);
adminRouter.delete("/delete-coupon/:id", isLogin, adminController.deleteCoupon);
adminRouter.post('/delete-offer/:id', isLogin, adminController.deleteOffer);

adminRouter.post('/login', isLogout, adminController.loginAdmin);
adminRouter.post('/add-category', isLogin, upload.array("thumbnail[]", 5), adminController.addCategory);
adminRouter.post('/add-product', isLogin, upload.array("thumbnail[]", 5), adminController.addProduct)
adminRouter.post('/edit-category', isLogin, upload.array("thumbnail",5),adminController.editCategory);
adminRouter.post('/offers/add', isLogin, upload.single('image'), adminController.addOffer);
adminRouter.post('/offers/edit', isLogin, isLogin, upload.single('image'),adminController.editOffer);
adminRouter.post('/edit-coupon', isLogin, adminController.editCoupon);
adminRouter.post('/add-coupon', isLogin, adminController.addCoupon);
adminRouter.post("/update-slider", isLogin, upload.fields([
  { name: "sliderImage1" }, { name: "sliderImage2" },
  { name: "sliderImage3" }, { name: "sliderImage4" }
]), adminController.updateSlider);
adminRouter.post("/update-offer-tag", isLogin, adminController.updateOfferTagline);
adminRouter.post("/return-update/:id", isLogin, adminController.returnUpdate)
adminRouter.post("/edit-product", isLogin, upload.array('thumbnail', 5), adminController.editProduct);
adminRouter.post("/update-order-status", isLogin, adminController.updateOrderStatus);
module.exports = adminRouter;