const express = require("express");
const userRouter = express();
const passport = require("passport");
const userController = require("../controllers/userController");
const { isLogin, isLogout } = require("../middleware/userAuth");
const upload = require("../multer/multer");
const Users = require("../models/userModel");
const UserHome = require("../models/userHomeModel");
const Categories = require("../models/categoryModel");
const router = express.Router();
const { sendAdminNotification } = require("../utils/emailSender");

userRouter.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    await sendAdminNotification({ name, email, subject, message });
    res.redirect("/contact?success=1");
  } catch (err) {
    console.error("Error sending message:", err);
    res.redirect("/contact?error=1");
  }
});

userRouter.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      res.locals.user = await Users.findById(req.session.user)
        .populate("orders.orderId")
        .populate("wishlist.productId")
        .populate("cart.productId");
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

userRouter.use(async (req, res, next) => {
  try {
    const userHomeData = await UserHome.findOne(); // Get the first (and only) document
    res.locals.offerTag = userHomeData?.offerTag || null;
  } catch (error) {
    console.error("Error fetching offer tag:", error);
    res.locals.offerTag = null;
  }

  next();
});

userRouter.use(async (req, res, next) => {
  try {
    const categories = await Categories.find().select("name"); // Get the first (and only) document
    res.locals.categories = categories || null;
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.locals.categories = null;
  }

  next();
});

userRouter.use((req, res, next) => {
  const currentUrl = req.originalUrl;

  res.locals.pathname = req.path;

  const isStaticAsset = currentUrl.startsWith('/assets');

  if (
    !req.session.user_id &&
    req.method === "GET" &&
    !["/signin", "/signup"].includes(currentUrl) &&
    !isStaticAsset
  ) {
    req.session.originalUrl = currentUrl;
  }

  next();
});

// Google login routes
userRouter.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signin" }),
  (req, res) => {
    req.session.user = req.user._id;
    res.redirect("/"); 
  }
);

  
userRouter.get("/", userController.viewHomepage);
userRouter.get("/signin", isLogout, userController.viewSignin);
userRouter.get("/signup", isLogout, userController.viewSignup);
userRouter.get("/signout", isLogin, userController.signOut);
userRouter.get("/forgot-password", isLogout, userController.viewForgotPassword);
userRouter.get("/reset-password", isLogout, userController.viewResetPassword);
userRouter.get("/shop", userController.viewShop);
userRouter.get('/search', userController.searchProducts);
userRouter.get("/product", userController.viewProduct);
userRouter.get("/cart", isLogin, userController.viewCart);
// userRouter.get("/wishlist", isLogin, userController.viewWishlist);
userRouter.get("/account", isLogin, userController.viewAccount);
userRouter.get("/contact", userController.viewContact);
// userRouter.get("/order-tracking", isLogin, userController.viewOrderTracking);
// userRouter.get("/product-return", isLogin, userController.viewProductReturn);
userRouter.get("/payment", isLogin, userController.viewPayment);
userRouter.get("/privacy-policy", userController.viewPrivacyPolicy);
userRouter.get("/terms-of-service", userController.viewTermsofService);
userRouter.get("/refund-policy", userController.viewRefundPolicy);
// userRouter.get("/return-policy", userController.viewReturnPolicy);
userRouter.get("/shipping-policy", userController.viewShippingPolicy);
userRouter.get("/api/countries", userController.getApiCountries);
userRouter.get("/api/search", userController.getApiSearch);
userRouter.get("/order", userController.viewOrderDetails);

userRouter.post("/signin", isLogout, userController.signIn);
userRouter.post("/signup", isLogout, userController.signUp);
userRouter.post("/add-to-cart", userController.addToCart);
// userRouter.post("/wishlist/add", userController.addToWishlist);
userRouter.post(
  "/return",
  isLogin,
  upload.single("image"),
  userController.returnRequest
);
userRouter.post("/checkout", isLogin, userController.viewCheckout);
userRouter.post(
  "/product/:id/review",
  isLogin,
  upload.array("images"),
  userController.addReview
);
userRouter.post("/forgot-password", isLogout, userController.forgotPassword);
userRouter.post("/account-edit", isLogin, userController.updateAccountDetails);


userRouter.post("/create-phonepe-order", userController.createPhonePeOrder);
userRouter.get("/status", userController.status);
 userRouter.delete("/cart/remove", isLogin, userController.removeFromCart);
userRouter.delete(
  "/wishlist/remove",
  isLogin,
 userController.removeFromWishlist
);
userRouter.post("/contact", userController.submitContactMessage);
userRouter.post('/confirm-delivery/:id', userController.confirmDelivery);
userRouter.post('/add-billing', isLogin, userController.addBillingAddress);


module.exports = userRouter;
