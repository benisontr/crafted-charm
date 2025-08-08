const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const Users = require("../models/userModel");
const Categories = require("../models/categoryModel");
const Products = require("../models/productModel");
const UserHome = require("../models/userHomeModel");
const Coupons = require("../models/couponModel");
const Orders = require("../models/orderModel");
const Offers = require("../models/offerModel");
const Requests = require("../models/returnRequestModel")
const Reviews = require("../models/reviewModel");
const nodemailer = require('nodemailer');

const viewLogin = async (req, res) => {
  try {
    res.render("admin/login", { message: "" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin/login");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const admin = await Users.findOne({ email, role: "admin" });
    if (!admin) {
      return res.render("admin/login", {
        message: "Invalid email or not an admin",
        messageType: "danger",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin/login", {
        message: "Invalid password",
        messageType: "danger",
      });
    }

    const token = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.admin = admin._id;

    res.redirect("/admin/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewDashboard = async (req, res) => {
  try {
    const orders = await Orders.find().populate("userId").populate("items.productId");
    const products = await Products.find();
    const customers = await Users.find();

    const totalOrders = orders.length;
    const totalProducts = products.length;
    const totalCustomers = customers.length;

    res.render("admin/dashboard", {
      orders,
      totalOrders,
      totalProducts,
      totalCustomers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCategory = async (req, res) => {
  try {
    const lastCategory = await Categories.findOne({})
      .sort({ createdAt: -1 })
      .select("categoryId");
    console.log("last", lastCategory);

    let nextCategoryId;

    if (lastCategory && lastCategory.categoryId) {
      // Extract numeric part (e.g., from 'INV00123')
      const lastSeq = parseInt(
        lastCategory.categoryId.replace("CatID-", ""),
        10
      );
      const newSeq = lastSeq + 1;
      nextCategoryId = `CatID-${String(newSeq).padStart(5, "0")}`;
    } else {
      // Default to INV00001 if no flights exist
      nextCategoryId = "CatID-00001";
    }
    console.log("last", nextCategoryId);
    res.render("admin/addCategory", { categoryId: nextCategoryId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListCategory = async (req, res) => {
  try {
    const categories = await Categories.find();
    res.render("admin/listCategory", { categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditCategory = async (req, res) => {
  const categoryId = req.query.id;

  try {
    const category = await Categories.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    console.log(category);
    res.render("admin/editCategory", { category });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddProduct = async (req, res) => {
  try {
    const lastProduct = await Products.findOne({})
      .sort({ createdAt: -1 })
      .select("productId");
    console.log("last", lastProduct);

    let nextProductId;

    if (lastProduct && lastProduct.productId) {
      // Extract numeric part (e.g., from 'INV00123')
      const lastSeq = parseInt(lastProduct.productId.replace("PID-", ""), 10);
      const newSeq = lastSeq + 1;
      nextProductId = `PID-${String(newSeq).padStart(5, "0")}`;
    } else {
      // Default to INV00001 if no flights exist
      nextProductId = "PID-00001";
    }
    console.log("last", nextProductId);

    const categories = await Categories.find({}).select("name"); // only fetch name and _id

    res.render("admin/addProduct", {
      productId: nextProductId,
      categories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListProduct = async (req, res) => {
  try {
    const products = await Products.find().populate("categoryId");
    res.render("admin/productList", { products });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditProduct = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findById(productId).populate("categoryId");
    if (!product) {
      return res.status(404).send("Product not found");
    }
    const categories = await Categories.find({}).select("name"); // only fetch name and _id
    res.render("admin/editProduct", { product, categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};


const viewProductDetails = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("admin/productDetails", { product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCoupon = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");
    res.render("admin/couponsAdd", { categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListCoupon = async (req, res) => {
  try {
    const coupons = await Coupons.find()
      .populate("productId")
      .populate("categoryId");
    res.render("admin/couponsList", { coupons });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOrder = async (req, res) => {
  try {
    const orders = await Orders.find().populate("userId").populate("items.productId");
    res.render("admin/orderList", {orders});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Orders.findById(orderId)
      .populate('userId')
      .populate('items.productId');

      if (!order) {
      return res.status(404).send("Order not found");
    }
    // ✅ Pass 'order' to the view
    res.render("admin/orderDetails", { order });

  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const viewListUser = async (req, res) => {
  try {
    const users = await Users.find({ role: "user" });
    res.render("admin/userList", { users });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserDetails = async (req, res) => {
  const userId = req.query.id;

  try {
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Find all orders placed by this user
    const orders = await Orders.find({ userId: user._id });

    // Calculate total price
    const totalOrderPrice = orders.reduce((sum, order) => sum + order.total, 0);

    res.render("admin/customerDetails", {
      user,
      totalOrderPrice,
      orders, // optional: if you want to show individual order details
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewInventory = async (req, res) => {
  try {
    const products = await Products.find().populate("categoryId");
    res.render("admin/inventory", { products });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewSalesReport = async (req, res) => {
  try {
     const products = await Products.find().populate("categoryId");
    res.render("admin/reportAndAnalysis", {products});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddOffers = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");
    res.render("admin/addOffers", { categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOffers = async (req, res) => {
  try {
    const offers = await Offers.find().lean();
    res.render("admin/listOffers", { offers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewHomeEditor = async (req, res) => {
  try {
    const homeEditArr = await UserHome.find().sort({ _id: -1 }).limit(1);
    const homeEdits = homeEditArr[0] || null;

    if (homeEdits && homeEdits.sliderImages) {
      console.log("Slider 1 image:", homeEdits.sliderImages.slider1); // ✅ correct
    }

    res.render("admin/homeEditor", { homeEdits });
  } catch (error) {
    console.error("Error in viewHomeEditor:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewOrderTracking = async (req, res) => {
  try {
    res.render("admin/orderTrackingAdmin", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewReturn = async (req, res) => {
  try {
    const returnRequests = await Requests.find().populate("userId");
    res.render("admin/returnView", { returnRequests });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addCategory = async (req, res) => {
  try {
    const { categoryId, categoryName, description } = req.body;

    // Collect uploaded file paths
    const thumbnails = req.files.map((file) => `/uploads/${file.filename}`);

    // Save to DB
    const newCategory = new Categories({
      categoryId,
      name: categoryName,
      description,
      images: thumbnails, // Store image paths array
    });

    await newCategory.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving category:", error);
    res.json({ success: false, message: error.message });
  }
};

const viewEditCoupon = async (req, res) => {
  const couponId = req.query.id;
  try {
    const coupon = await Coupons.findById(couponId);
    const categories = await Categories.find({}).select("name"); // only fetch name and _id
    res.render("admin/editCoupon", { categories, coupon });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      productId,
      categoryId,
      name,
      productCode,
      price,
      discount,
      description,
      stock,
      lowStockLimit,
      isAvailable, // ✅ get checkbox value
    } = req.body;

    // ✅ Process uploaded files
    const thumbnails = req.files.map((file) => `/uploads/${file.filename}`);

    // ✅ Create and save new product
    const newProduct = new Products({
      productId,
      categoryId,
      name,
      productCode,
      price: Number(price),
      discount: Number(discount),
      description,
      stock: Number(stock),
      lowStockLimit: Number(lowStockLimit),
      isAvailable: isAvailable === "on", // checkbox sends "on" if checked
      images: thumbnails,
      availableStock: Number(stock),
    });

    await newProduct.save();

    res.status(200).json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const category = await Categories.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // 1. Find products linked to this category
    const products = await Products.find({ categoryId: category._id });

    // 2. Loop through products and delete their images
    for (const product of products) {
      product.images.forEach((image) => {
        const filePath = path.join(__dirname, "../public/uploads", image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // 3. Delete the product from DB
      await Products.findByIdAndDelete(product._id);
    }

    // 4. Delete category images from filesystem
    category.images.forEach((image) => {
      const filePath = path.join(__dirname, "../public/uploads", image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // 5. Delete the category itself
    await Categories.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category and related products deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Optional: Delete images from filesystem if stored locally
    product.images.forEach((image) => {
      const filePath = path.join(__dirname, "../public/uploads", image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Products.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const editCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const { name, description, existingImages } = req.body;

    const category = await Categories.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Parse retained old images
    let retainedImages = [];
    if (existingImages) {
      retainedImages = JSON.parse(existingImages); // array of old image filenames
    }

    // Upload new images
    let newImages = req.files?.map((file) => `/uploads/${file.filename}`) || [];

    // Delete old images that were removed
    category.images.forEach(img => {
  const imgFilename = path.basename(img); // get filename only
  if (!retainedImages.includes(imgFilename)) {
    const imgPath = path.join(__dirname, "../public", img); // img already includes /uploads
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
});


    // Merge retained + new
category.images = [...retainedImages.map(name => `/uploads/${name}`), ...newImages];
    category.name = name;
    category.description = description;

    await category.save();

    res.json({ success: true, message: "Category updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// const editCategory = async (req, res) => {
//   try {
//     const categoryId = req.query.id;
//     const { name, description, existingImages } = req.body;

//     const category = await Categories.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({ success: false, message: "Category not found" });
//     }

//     // Parse retained old images
//     let retainedImages = [];
//     if (existingImages) {
//       retainedImages = JSON.parse(existingImages).map(name => `/uploads/${name}`); // FIXED: add /uploads/
//     }

//     // Upload new images
//     let newImages = req.files?.map((file) => `/uploads/${file.filename}`) || [];

//     // Delete old images that were removed
//     category.images.forEach(img => {
//       if (!retainedImages.includes(img)) {
//         const imgPath = path.join(__dirname, "../public", img); // use `img` directly
//         if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
//       }
//     });

//     // Merge retained + new
//     category.images = [...retainedImages, ...newImages];
//     category.name = name;
//     category.description = description;

//     await category.save();

//     res.json({ success: true, message: "Category updated successfully" });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

const viewProductsByCategory = async (req, res) => {
  try {
    const products = await Products.find({ categoryId: req.params.categoryId });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// const updateSlider = async (req, res) => {
//   try {
//     const homeData = await UserHome.findOne();
//     if (!homeData)
//       return res
//         .status(404)
//         .json({ success: false, message: "Home content not found" });

//     const sliderImages = [...homeData.sliderImages]; // Copy current sliderImages

//     console.log("Uploaded Files:", req.files);

//     const updatedSliderImages = [];

//     for (let i = 1; i <= 4; i++) {
//       const field = `sliderImage${i}`;
//       const key = `slider${i}`;

//       // Step 1: Try to get old path safely
//       const oldEntry = homeData.sliderImages[i - 1];
//       let oldPath = oldEntry && oldEntry[key] ? oldEntry[key] : "";

//       // Step 2: Check if new file uploaded
//       let newPath = oldPath; // default to old path

//       if (req.files && req.files[field] && req.files[field][0]) {
//         newPath = "/uploads/" + req.files[field][0].filename;

//         // Optional: delete old image
//         if (oldPath) {
//           const filePath = path.join(__dirname, "../public", oldPath);
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//           }
//         }
//       }

//       // Step 3: If newPath is still empty (means no old and no new), set a default dummy
//       if (!newPath) {
//         newPath = "/uploads/placeholder.jpg"; // or skip this field if truly optional
//       }

//       // ✅ Step 4: Push valid key-value object
//       updatedSliderImages.push({ [key]: newPath });
//     }

//     // Replace and save
//     homeData.sliderImages = updatedSliderImages;
//     await homeData.save();

//     return res.json({ success: true, message: "Slider updated successfully" });
//   } catch (err) {
//     console.error("Error updating slider:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const updateSlider = async (req, res) => {
  try {
    const homeData = await UserHome.findOne();
    if (!homeData) {
      return res.status(404).json({ success: false, message: "Home content not found" });
    }

    const currentImages = homeData.sliderImages || {};
    const updatedImages = { ...currentImages };

    for (let i = 1; i <= 4; i++) {
      const field = `sliderImage${i}`;
      const key = `slider${i}`;

      // Check if a new file was uploaded
      if (req.files && req.files[field] && req.files[field][0]) {
        const newPath = "/uploads/" + req.files[field][0].filename;

        // Delete old image if it exists
        const oldPath = currentImages[key];
        if (oldPath) {
          const oldFilePath = path.join(__dirname, "../public", oldPath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        // Update with new image path
        updatedImages[key] = newPath;
      }
    }

    // Save only the updated fields
    homeData.sliderImages = updatedImages;
    await homeData.save();

    return res.json({ success: true, message: "Slider updated successfully" });
  } catch (err) {
    console.error("Error updating slider:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      code,
      categoryId,
      productId,
      discountValue,
      startDate,
      endDate,
      status,
    } = req.body;
    const [startDay, startMonth, startYear] = startDate.split("-");
    const [endDay, endMonth, endYear] = endDate.split("-");

    const parsedStartDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const parsedEndDate = new Date(`${endYear}-${endMonth}-${endDay}`);
    const coupon = new Coupons({
      code,
      categoryId,
      productId,
      discountPercentage: discountValue,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status,
    });

    await coupon.save();

    res.json({ success: true, message: "Coupon created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const updateOfferTagline = async (req, res) => {
  try {
    const { tagline } = req.body;

    if (!tagline || typeof tagline !== "string" || !tagline.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid tagline." });
    }

    const homeContent = await UserHome.findOne();
    if (!homeContent) {
      return res
        .status(404)
        .json({ success: false, message: "UserHome data not found." });
    }

    homeContent.offerTag = tagline.trim();
    await homeContent.save();

    res.json({ success: true, message: "Tagline updated successfully." });
  } catch (err) {
    console.error("Tagline update error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while updating tagline.",
      });
  }
};

const editCoupon = async (req, res) => {
  const couponId = req.query.id;
  console.log("Coupon ID from URL:", req.query.id);


  try {
    const {
      code,
      categoryId,
      productId,
      discountValue,
      startDate,
      endDate,
      status,
    } = req.body;
    console.log(req.body);
    const [startDay, startMonth, startYear] = startDate.split("-");
    const [endDay, endMonth, endYear] = endDate.split("-");

    const parsedStartDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const parsedEndDate = new Date(`${endYear}-${endMonth}-${endDay}`);

    await Coupons.findByIdAndUpdate(couponId, {
      code,
      categoryId,
      productId,
      discountPercentage: discountValue,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status,
    });

    return res.json({ success: true }); // 👈 go back to the list page
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).send("Error updating coupon");
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await Coupons.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete coupon" });
  }
};

const addOffer = async (req, res) => {
  try {
    const { title, description, startDate, endDate, discount, categoryId,
      productId, } = req.body;
    const image = req.file ? req.file.filename : null;

    const newOffer = new Offers({
      name: title,

      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountPercentage: discount,
      image,
      categoryId,
      productId
    });

    await newOffer.save();

    res.redirect("/admin/list-offers"); // change to wherever your list view is
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).send("Failed to add offer");
  }
};

const viewEditOffer = async (req, res) => {
  console.log("hai");
  const offerId = req.query.id; // or use req.params.id if using route like /offer/edit/:id
  console.log(offerId);
  try {
    const offer = await Offers.findById(offerId);

    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    const categories = await Categories.find({}).select("name"); 

    res.render("admin/editOffer", { offer, categories });
  } catch (error) {
    console.log("Error loading edit offer page:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    await Offers.findByIdAndDelete(offerId);
    res.redirect("/admin/list-offers"); // redirect to list page after deletion
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const { title, description, startDate, endDate, discount, categoryId,
      productId } = req.body;

    const offer = await Offers.findById(offerId);
    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    // Update basic fields
    offer.name = title;
    offer.description = description;
    offer.startDate = new Date(startDate);
    offer.endDate = new Date(endDate);
    offer.discountPercentage = discount;
    offer.categoryId = categoryId;
    offer.productId = productId;

    // Handle image replacement
    if (req.file) {
      // Delete old image if it exists
      if (offer.image) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          "uploads",
          offer.image
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image name
      offer.image = req.file.filename;
    }

    await offer.save();

    res
      .status(200)
      .json({ success: true, message: "Offer updated successfully" });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const returnUpdate = async (req, res) => {
  try {
    const { status } = req.body;
    await Requests.findByIdAndUpdate(req.params.id, { status });
    res.redirect("/admin/view-return"); 
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
};


const viewReview = async (req, res) => {
  try {
    const reviews = await Reviews.find().populate("userId").populate("productId").exec();
    res.render("admin/viewReview", { reviews });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteReview =async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Find the review to get productId for redirect
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).send("Review not found");

    
    await Reviews.findByIdAndDelete(reviewId);
    res.redirect('/admin/view-review'); // Or wherever your admin sees the product
  } catch (err) {
    console.error("Delete Review Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.query.id;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    } 

    const existingProduct = await Products.findById(productId);
    if (!existingProduct) return res.status(404).send("Product not found");

    const {
      name,
      productCode,
      price,
      discount,
      description,
      stock,
      lowStockLimit,
      isAvailable,
      categoryId,
    } = req.body;

    // Log uploaded files
    console.log("Uploaded files:", req.files);

    let uploadedImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => "/uploads/" + file.filename);
      uploadedImages = [...uploadedImages, ...newImages]; // append
    }

    existingProduct.name = name;
    existingProduct.productCode = productCode;
    existingProduct.price = price;
    existingProduct.discount = discount;
    existingProduct.description = description;
    existingProduct.stock = stock;
    existingProduct.lowStockLimit = lowStockLimit;
    existingProduct.isAvailable = isAvailable === "true" || isAvailable === "on" || isAvailable === true;
    existingProduct.categoryId = categoryId;
    existingProduct.images = uploadedImages;

    await existingProduct.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Edit Product Error:", error);
    res.status(500).send("Server Error");
  }
};



const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    const order = await Orders.findById(orderId).populate("userId").populate("items.productId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = formattedStatus;
    await order.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    // Create HTML for items in order
    const orderItemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px 15px;">${item.productId.name}</td>
        <td style="padding: 10px 15px;">${item.quantity}</td>
        <td style="padding: 10px 15px;">₹${item.price}</td>
      </tr>
    `).join("");

    const mailOptions = {
      from: `"Crafted Charm" <${process.env.EMAIL}>`,
      to: order.userId.email,
      subject: `Order #${order.orderId} status changed to ${formattedStatus}`,
      headers: {
        'X-Unique-Id': `${order._id}-${Date.now()}`
      },
      html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
          <div style="background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px #ccc;">
            <h2 style="color: #4CAF50;">Order Update from Crafted Charm</h2>
            <p>Hello <strong>${order.userId.name || "Customer"}</strong>,</p>
            <p>Your order <strong>#${order.orderId}</strong> status has been updated to:</p>
            <p style="font-size: 20px; color: #2196F3;"><strong>${formattedStatus}</strong></p>
            
            <h3 style="margin-top: 30px;">Order Details:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="text-align: left; padding: 10px 15px;">Product</th>
                  <th style="text-align: left; padding: 10px 15px;">Quantity</th>
                  <th style="text-align: left; padding: 10px 15px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
              </tbody>
            </table>

            <p style="margin-top: 30px;">Thank you for shopping with us.</p>
            <p style="color: #888;">Crafted Charm Team</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: "Order status updated and email sent." });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  viewLogin,
  logoutAdmin,
  loginAdmin,
  viewDashboard,
  viewAddCategory,
  viewListCategory,
  viewEditCategory,
  viewAddProduct,
  viewListProduct,
  viewEditProduct,
  viewProductDetails,
  viewAddCoupon,
  viewListCoupon,
  viewListOrder,
  viewOrderDetails,
  viewListUser,
  viewUserDetails,
  viewInventory,
  viewSalesReport,
  viewAddOffers,
  viewListOffers,
  viewHomeEditor,
  viewOrderTracking,
  viewReturn,
  deleteCategory,
  deleteProduct,
  addCategory,
  addProduct,
  editCategory,
  viewProductsByCategory,
  updateSlider,
  addCoupon,
  updateOfferTagline,
  viewEditCoupon,
  editCoupon,
  deleteCoupon,
  addOffer,
  viewEditOffer,
  deleteOffer,
  editOffer,
  returnUpdate,
  editProduct,
  viewReview,
  deleteReview,
  updateOrderStatus,
};
