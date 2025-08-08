const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../models/userModel");
const { countries } = require('countries-list');
const UserHome = require("../models/userHomeModel");
const Products = require("../models/productModel");
const Offers = require("../models/offerModel")
const Categories = require("../models/categoryModel");
const Requests = require('../models/returnRequestModel');
const Reviews = require('../models/reviewModel');
const Coupons = require('../models/couponModel');
const Orders = require('../models/orderModel')
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const baseUrl = process.env.BASE_URL || "http://localhost:3000"; // Ensure BASE_URL is set in your .env file
// ===================
// PhonePe Config
// ===================
// const CLIENT_ID = "SU2504031724337089600354";
// const CLIENT_SECRET = "299536df-733d-430e-84dc-0d932b331af9";

const CLIENT_ID = "TEST-M2336HV644IDN_25062";
const CLIENT_SECRET = "MTI5YTU1YWQtNTIxZS00ZTYzLWE0ZDQtNTFiYjRhZTdmOWUw";
const SALT_INDEX = "1";
// const ENV = Env.PRODUCTION; // Change to "UAT" for testing
const ENV = Env.UAT;

const client = StandardCheckoutClient.getInstance(CLIENT_ID, CLIENT_SECRET, SALT_INDEX, ENV);

const redirectUrl = `${baseUrl}/status`; 
const successUrl = `${baseUrl}/?success=1`;
const failureUrl = `${baseUrl}/?success=0`;

const tempBookingStore = {}; // Temporary store for booking data

// ==========================
// ▶️ Create PhonePe Order
// ==========================
const createPhonePeOrder = async (req, res) => {
  
  try {

const { cartData, address, shippingCharge, discount, total } = req.body;
    const userId = req.session.user;
    if (!cartData || !userId) {
      return res.status(400).json({ error: "Missing cart data or user session" });
    }

    const { items } = JSON.parse(cartData);

    const user = await Users.findById(userId);
    if (!user || !items.length || !total) {
      return res.status(400).json({ error: "Invalid user/cart" });
    }

const amount = parseInt(total); // total should be rupees, convert to integer
    const name = user.name;
    const phone = user.mobile;
    // if (!amount || !name || !phone || !/^\d{10}$/.test(phone)) {
    //   return res.status(400).json({ error: "Invalid input" });
    // }

    const orderId = uuidv4();

    tempBookingStore[orderId] = {
  user: {
    name,
    email: user.email,
    phone,
  },
  items,
  total,
  paid: 1,
  address,
  shippingCharge,
  discount,
};

    const redirectWithOrder = `${redirectUrl}?id=${orderId}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(orderId)
      .amount(amount * 100)
      .redirectUrl(redirectWithOrder)
      .build();
    const response = await client.pay(request);
    console.log("response",response)
    return res.json({ checkoutPageUrl: response.redirectUrl });

  } catch (error) {
    console.error("❌ Error in payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
};

// ==========================
// ✅ Check Payment Status
// ==========================
// const status = async (req, res) => {
//   try {
//     const merchantOrderId = req.query.id;
//     if (!merchantOrderId) return res.redirect(failureUrl);

//     const response = await client.getOrderStatus(merchantOrderId);
//     const status = response.state;

//     if (status !== "COMPLETED") return res.redirect(failureUrl);
//     if (!req.session?.user) return res.redirect(failureUrl);

//     const orderData = tempBookingStore[merchantOrderId];
//     if (!orderData) return res.redirect(failureUrl);

//     const newOrder = new Orders({
//       userId: req.session.user,
//       items: orderData.items.map(item => ({
//         productId: item.productId,
//         quantity: item.quantity,
//         price: Number(item.price),
//         subtotal: Number(item.subtotal),
//       })),
//       shippingCharge: Number(orderData.shippingCharge),
//       discount: Number(orderData.discount),
//       total: Number(orderData.total),
//       paymentMethod: "PhonePe",
//       paymentStatus: "Paid",
//       status: "Pending",
//       address: orderData.address,
//     });

//     await newOrder.save();

//     await Users.findByIdAndUpdate(req.session.user, {
//       $push: { orders: { orderId: newOrder._id } },
//       $set: {
//         "address.0.shipping": {
//           name: orderData.address.name,
//           addressLine: orderData.address.line,
//           city: orderData.address.city,
//           state: orderData.address.state,
//           country: orderData.address.country || "India",
//           pincode: orderData.address.pincode,
//           phone: orderData.address.phone,
//         },
//       },
//     });

//     for (const item of orderData.items) {
//       await Products.updateOne(
//         { _id: item.productId },
//         { $inc: { availableStock: -item.quantity } }
//       );
//     }

//     const order = await Orders.findById(newOrder._id).populate('items.productId');
//       async function generateInvoicePDF(order, orderData) {
//     const PDFDocument = require('pdfkit');
//     const getStream = require('get-stream');
//       const doc = new PDFDocument({ size: 'A4', margin: 40 });
//       const black = '#111111';
//       const gray = '#666666';
//       const lightGray = '#F4F4F4';

//       try {
//         doc.image('public/assets/images/logo-1.png', 40, 40, { width: 60 });
//       } catch {
//         doc.fillColor(black).fontSize(20).font('Helvetica-Bold')
//           .text('Crafted Charm', 40, 50);
//       }

//       doc.fontSize(10).fillColor(gray)
//         .text('Crafted Charm', 120, 45)
//         .text('Hubli, Karnataka - 580020', 120, 58)
//         .text('Phone: +91 8217719225', 120, 71)
//         .text('Email: craftedcharm.luck@gmail.com', 120, 84);

//       doc.fontSize(20).fillColor(black).font('Helvetica-Bold')
//         .text('INVOICE', 400, 50, { align: 'right' });

//       doc.fontSize(10).font('Helvetica')
//         .text(`Invoice #${order._id}`, 400, 75, { align: 'right' })
//         .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 400, 90, { align: 'right' });

//       doc.rect(430, 110, 100, 25).fill('#28a745');
//       doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
//         .text('PAID', 460, 117);
//       doc.fillColor('black');

//       doc.moveTo(40, 140).lineTo(555, 140).strokeColor(gray).stroke();

//       const dueDate = new Date(order.createdAt);
//       dueDate.setDate(dueDate.getDate() + 10);

//       doc.fontSize(11).font('Helvetica-Bold').fillColor(black).text('Bill To:', 40, 155);
//       doc.fontSize(10).font('Helvetica')
//         .text(orderData.address.name, 40, 170)
//         .text(orderData.address.line, 40, 185)
//         .text(`${orderData.address.city}, ${orderData.address.state}`, 40, 200)
//         .text(`Pincode: ${orderData.address.pincode}`, 40, 215)
//         .text(`Phone: ${orderData.address.phone}`, 40, 230)
//         .text(`Email: ${orderData.address.email}`, 40, 245);

//       doc.fontSize(11).font('Helvetica-Bold').text('Payment Details:', 300, 155);
//       doc.fontSize(10).font('Helvetica')
//         .text(`Method: ${order.paymentMethod}`, 300, 170)
//         .text(`Transaction ID: ${order.transactionId || 'N/A'}`, 300, 185)
//         .text(`Status: Paid`, 300, 200)
//         .text(`Due Date: ${dueDate.toLocaleDateString('en-IN')}`, 300, 215);

//       const tableTop = 280;
//       doc.fontSize(10).font('Helvetica-Bold').fillColor(black);
//       doc.rect(40, tableTop, 515, 20).fill(lightGray);
//       doc.fillColor(black)
//         .text('Product', 45, tableTop + 5)
//         .text('Qty', 400, tableTop + 5, { width: 40, align: 'right' })
//         .text('Price', 480, tableTop + 5, { width: 60, align: 'right' });

//       let y = tableTop + 25;
//       doc.font('Helvetica').fontSize(10).fillColor(black);

//       order.items.forEach((item, i) => {
//         doc.fillColor(i % 2 === 0 ? '#FFFFFF' : '#FAFAFA').rect(40, y - 5, 515, 20).fill();
//         doc.fillColor(black)
//           .text(item.productId.name, 45, y)
//           .text(item.quantity.toString(), 400, y, { width: 40, align: 'right' })
//           .text(`₹${Number(item.subtotal).toFixed(2)}`, 480, y, { width: 60, align: 'right' });
//         y += 20;
//       });

//       const subtotal = orderData.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
//       const shipping = Number(orderData.shippingCharge);
//       const tax = 0;
//       const total = subtotal + tax + shipping;

//       y += 10;
//       const addTotalRow = (label, amount, bold = false) => {
//         doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
//           .fillColor(black)
//           .text(label, 400, y, { width: 80, align: 'right' })
//           .text(`₹${Number(amount).toFixed(2)}`, 480, y, { width: 60, align: 'right' });
//         y += 15;
//       };

//       addTotalRow('Subtotal:', subtotal);
//       addTotalRow('Tax (0%):', tax);
//       addTotalRow('Shipping:', shipping);
//       addTotalRow('Total:', total, true);
//       addTotalRow('Amount Paid:', total);
//       addTotalRow('Balance Due:', 0);

//       doc.moveTo(40, 700).lineTo(555, 700).strokeColor('#CCCCCC').stroke();
//       doc.fontSize(8).fillColor(gray)
//         .text('Thank you for your business!', 40, 710)
//         .text('Crafted Charm | Hubli, Karnataka', 40, 725)
//         .text('Phone: +91 8217719225 | Email: craftedcharm.luck@gmail.com', 40, 740)
//         .text(`Invoice generated on ${new Date().toLocaleString('en-IN')}`, 400, 740, { align: 'right' });

//       doc.end();
//       return await getStream.buffer(doc);
//     }

//     function generateEmailHTML(order, orderData, newOrder) {
//       return `
//       <div style="font-family: Arial; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
//         <h2 style="background: #5e9c76; color: white; padding: 15px;">Thank you for your order</h2>
//         <p>Hi <strong>${orderData.address.name}</strong>,</p>
//         <p>Your order <strong>${newOrder.orderId}</strong> is now being processed.</p>
//         <table width="100%" border="1" cellpadding="10" cellspacing="0" style="margin-top: 15px;">
//           <thead>
//             <tr style="background: #f2f2f2;">
//               <th>Product</th>
//               <th>Qty</th>
//               <th>Price</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${order.items.map(item => `
//               <tr>
//                 <td>${item.productId.name}</td>
//                 <td align="center">${item.quantity}</td>
//                 <td align="right">₹${Number(item.subtotal).toFixed(2)}</td>
//               </tr>`).join('')}
//             <tr>
//               <td colspan="2" align="right"><strong>Subtotal:</strong></td>
//               <td align="right">₹${subtotal.toFixed(2)}</td>
//             </tr>
//             <tr>
//               <td colspan="2" align="right"><strong>Shipping:</strong></td>
//               <td align="right">₹${shipping.toFixed(2)}</td>
//             </tr>
//             <tr>
//               <td colspan="2" align="right"><strong>Total:</strong></td>
//               <td align="right"><strong>₹${total.toFixed(2)}</strong></td>
//             </tr>
//           </tbody>
//         </table>
//         <p>📦 Address: ${orderData.address.line}, ${orderData.address.city} - ${orderData.address.pincode}</p>
//         <p>📞 Phone: ${orderData.address.phone}</p>
//       </div>`;
//     }

//     const pdfBuffer = await generateInvoicePDF(order, orderData);

//     await transporter.sendMail({
//       from: process.env.EMAIL,
//       to: orderData.address.email,
//       subject: `🧺 Crafted Charm Order #${newOrder.orderId}`,
//       html: generateEmailHTML(order, orderData, newOrder),
//       attachments: [{
//         filename: `Invoice_${newOrder.orderId}.pdf`,
//         content: pdfBuffer,
//         contentType: 'application/pdf'
//       }]
//     });

//     delete tempBookingStore[merchantOrderId];
//     return res.redirect(`${baseUrl}/order?id=${newOrder._id}`);
//   } catch (error) {
//     console.error("❌ Status Error:", error.message);
//     return res.redirect(failureUrl);
//   }
// };

const status = async (req, res) => {
  try {
    const merchantOrderId = req.query.id;
    if (!merchantOrderId) {
      console.error("❌ No merchantOrderId provided in query params");
      return res.redirect(failureUrl);
    }

    const response = await client.getOrderStatus(merchantOrderId);
    console.log("📦 Full status response:", JSON.stringify(response, null, 2));

    const status = response.state;
    console.log(status)

    if (status === "COMPLETED") {
      console.log(tempBookingStore)
      const orderData = tempBookingStore[merchantOrderId];
      console.log(orderData)
      if (!orderData) {
        console.error("❌ Order data not found in temp store");
        return res.redirect(failureUrl);
      }

      const newOrder = new Orders({
  userId: req.session.user,
  items: orderData.items.map(item => ({
    productId: item.productId, // ✅ must be present
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  })),
  shippingCharge: orderData.shippingCharge,
  discount: orderData.discount,
  total: orderData.total,
  paymentMethod: "PhonePe",
  paymentStatus: "Paid",
  status: "Pending", // ✅ corrected from "Paid"
  address: orderData.address,
});
      await newOrder.save();

await Users.findByIdAndUpdate(req.session.user, {
    $push: {
    orders: {
      orderId: newOrder._id
    }
  },
  $set: {
    "address.0.shipping": {
      name: orderData.address.name,
      addressLine: orderData.address.line,
      city: orderData.address.city,
      state: orderData.address.state,
      country: orderData.address.country || "India", // fallback if country missing
      pincode: orderData.address.pincode,
      phone: orderData.address.phone,
    }
  }
});

// 🔽 Decrease available stock of each product
for (const item of orderData.items) {
  await Products.updateOne(
    { _id: item.productId },
    { $inc: { availableStock: -item.quantity } }
  );
}

const order = await Orders.findById(newOrder._id).populate('items.productId');

      await transporter.sendMail({
  from: process.env.EMAIL,
  to: orderData.address.email,
  subject: "🧺 Your Crafted Charm Order Confirmed: " + newOrder.orderId,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <h2 style="background: #5e9c76; color: white; padding: 15px; margin: 0;">Thank you for your order</h2>
      <p>Hi <strong>${orderData.address.name}</strong>,</p>
      <p>Just to let you know — we’ve received your order <strong>${newOrder.orderId}</strong>, and it is now being processed:</p>

      <h3 style="color: #5e9c76;">[Order ${newOrder.orderId}] (${new Date(newOrder.createdAt).toDateString()})</h3>
      
      <table width="100%" border="1" cellspacing="0" cellpadding="10" style="border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f2f2f2;">
            <th align="left">Product</th>
            <th align="center">Quantity</th>
            <th align="right">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>${item.productId.name || 'Product'}</td>
              <td align="center">${item.quantity}</td>
              <td align="right">₹${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="2" align="right"><strong>Subtotal:</strong></td>
            <td align="right">₹${(orderData.items.reduce((acc, item) => acc + Number(item.subtotal), 0)).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" align="right"><strong>Shipping:</strong></td>
            <td align="right">₹${orderData.shippingCharge.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" align="right"><strong>Total:</strong></td>
            <td align="right"><strong>₹${orderData.total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <p><strong>Payment method:</strong> ${newOrder.paymentMethod}</p>

      <h3 style="color: #5e9c76;">Shipping address</h3>
      <p>
        ${orderData.address.name}<br>
        ${orderData.address.line}<br>
        ${orderData.address.city}, ${orderData.address.state} ${orderData.address.pincode}<br>
        ${orderData.address.phone}<br>
        ${orderData.address.email}
      </p>

      <p>Your order will be dispatched within 8 to 10 days and should arrive within an additional 2 to 3 days. Thanks for shopping with us!</p>

      <footer style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
        Crafted Charm — Built by Crafted Charm
      </footer>
    </div>
  `
});

      delete tempBookingStore[merchantOrderId];
      return res.redirect(`${baseUrl}/order?id=${newOrder._id}`);
    } else {
      console.log(`Payment status: ${status}`);
      return res.redirect(failureUrl);
    }
  } catch (error) {
    console.error("Error in status check:", error.response?.data || error.message, error.stack);
    return res.redirect(failureUrl);
  }
};
const viewHomepage = async (req, res) => {
  try {
    const homeEdits = await UserHome.find({}, { sliderImages: 1, _id: 0 });
    const products = await Products.find();
    const newArrivals = await Products.find().sort({ createdAt: -1 });
    let userWishlistProductIds = [];

    if (req.session.user) {
  const user = await Users.findById(req.session.user);
  userWishlistProductIds = user?.wishlist?.map(item => item.productId.toString()) || [];
}

    // Get all products with offers (for offers area)
    const offersArea = await Offers.find()
      .populate("productId")
      .sort({ createdAt: -1 });

    // Filter for best deals (only those active today)
    const today = new Date();
    const bestDeals = await Offers.find({
      startDate: { $lte: today },
      endDate: { $gte: today }
    })
      .populate("productId")
      .sort({ discountPercentage: -1 }); // Highest discount first

    res.render("user/home", {
      sliderImages: homeEdits[0]?.sliderImages || {},
      products,
      newArrivals,
      offersArea,
      bestDeals,
      userWishlistProductIds
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSignin = async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.render("user/signin", { message: "", messageType:"" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSignup = async (req, res) => {
  try {
    res.render("user/signup", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const signUp = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.render("user/signup", {
        message: "Password does not match",
        messageType: "danger",
      });
    }

    // Check if the email already exists
    const existingUserByEmail = await Users.findOne({ email });
    if (existingUserByEmail) {
      return res.render("user/signup", {
        message: "User with this email already exists",
        messageType: "danger",
      });
    }

    // Step 2: Create the user and reference the subscription
    const newUser = new Users({
      name: name,
      email: email,
      password: password,
    });
    
    await newUser.save();

    await transporter.sendMail({
  from: process.env.EMAIL,
  to: newUser.email,
  subject: `👋 Welcome to Crafted Charm, ${newUser.name}!`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <h2 style="background: #5e9c76; color: white; padding: 15px; margin: 0;">Welcome to Crafted Charm</h2>
      <p>Hi <strong>${newUser.name}</strong>,</p>
      <p>Thank you for signing up with us. We’re thrilled to have you!</p>
      <p>You can now explore and purchase our finest products.</p>
      <p style="margin-top: 30px;">Warm regards,<br/><strong>Team Crafted Charm</strong></p>

      <footer style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
        Crafted Charm — Crafted with Love
      </footer>
    </div>
  `,
});

    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.user = newUser._id;

    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.render("user/signup", {
      message: "An error occurred during signup.",
      messageType: "danger",
    }); // Send error to user.
  }
};

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("user/signin", {
        message: "Username or Password does not match",
        messageType: "danger",
      });
    }

    // Send login alert
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: "🔐 Login Alert - Crafted Charm",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="background: #5e9c76; color: white; padding: 15px; margin: 0;">Login Alert</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>We noticed a new login to your account at Crafted Charm.</p>
          <p>If this was you, you can safely ignore this email. Otherwise, please reset your password immediately.</p>
          <p style="margin-top: 30px;">Warm regards,<br/><strong>Team Crafted Charm</strong></p>
          <footer style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
            Crafted Charm — Crafted with Love
          </footer>
        </div>
      `,
    });

    // Create JWT and session
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.user = user._id;

    // Handle redirect after login
    const redirectUrl = req.session.originalUrl || "/account";
    delete req.session.originalUrl;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).render("user/signin", {
      message: "Something went wrong. Please try again later.",
      messageType: "danger",
    });
  }
};


const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewForgotPassword = async (req, res) => {
  try {
    res.render("user/forgotPassword", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewResetPassword = async (req, res) => {
  const token = req.query.token;
  console.log(token);

  try {
    res.render("user/resetPassword", { token, message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewShop = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");

    const selectedCategory = req.query.category;
    const sortOption = req.query.sort || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // or however many products per page you want
    let filter = {};

    if (selectedCategory) {
      const categoryDoc = await Categories.findOne({ name: selectedCategory });
      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      }
    }

    let query = Products.find(filter).populate("categoryId", "name");

    // Apply sorting
    if (sortOption === 'price-asc') {
      query = query.sort({ price: 1 });
    } else if (sortOption === 'price-desc') {
      query = query.sort({ price: -1 });
    } else if (sortOption === 'newest') {
      query = query.sort({ createdAt: -1 });
    }

    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await query.skip((page - 1) * limit).limit(limit);

    const allProducts = await Products.find({}).populate("categoryId", "name");

    res.render("user/shop", {
      allProducts,
      products,
      categories,
      selectedCategory,
      sortOption,
      totalProducts,
      showingCount: products.length,
      totalPages,         // ✅ Pass this to EJS
      currentPage: page   // ✅ Pass this to EJS
    });
  } catch (error) {
    console.error("Error in viewShop:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const viewProduct = async (req, res) => {
  const productId = req.query.id;

  try {
    // 1. Find the current product
    const product = await Products.findById(productId).populate("categoryId");

    if (!product) return res.status(404).send("Product not found");

    // 2. Get all reviews for this product
    const reviews = await Reviews.find({ productId });

    // 3. Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      avgRating = (totalRating / reviews.length).toFixed(1);
    }

    // 4. Recently viewed products logic
    if (!req.session.recentlyViewed) req.session.recentlyViewed = [];

    req.session.recentlyViewed = req.session.recentlyViewed.filter(id => id !== productId);
    req.session.recentlyViewed.unshift(productId);
    req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 10);

    const recentlyViewedIds = req.session.recentlyViewed.filter(id => id !== productId);
    const recentlyViewedProducts = await Products.find({ _id: { $in: recentlyViewedIds } });

    // 5. Get products from the same category (excluding the current product)
    const sameCategoryProducts = await Products.find({
      categoryId: product.categoryId._id,
      _id: { $ne: product._id }
    }).limit(10);

    // 6. Render the page
    res.render("user/product", {
      product,
      reviews,
      avgRating,
      recentlyViewedProducts,
      sameCategoryProducts
    });

  } catch (error) {
    console.error("Product View Error:", error);
    res.render("error", { error });
  }
};

const viewCart = async (req, res) => {
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.redirect("/signin"); // or show a friendly message
    }

    const user = await Users.findById(userId).populate("cart.productId");

    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    const carts = user.cart || [];

    res.render("user/cart", { carts });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};


const viewCheckout = async (req, res) => {
  const { cartData } = req.body;
  let parsed;
  const userId = req.session.user;
  console.log("cartData:", cartData);
  try {
    parsed = JSON.parse(cartData);
    console.log("Cart Items:", parsed.items);
    console.log("Total:", parsed.total);

    const user = await Users.findById(userId).populate("cart.productId").populate("wishlist.productId").populate("orders.orderId");
    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    const coupons = await Coupons.find({ status: "Active" }).populate("productId").populate("categoryId");

    // Save to DB, session, or pass to payment gateway
    res.render("user/checkout", { cart: parsed.items, total: parsed.total, user, coupons });
  } catch (e) {
    console.error("Invalid cart data:", e);
    res.status(400).send("Invalid cart data");
  }
};

const viewWishlist = async (req, res) => {
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.redirect("/signin"); // or show a friendly message
    }

    const user = await Users.findById(userId).populate("wishlist.productId");

    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    const wishlists = user.wishlist || [];

    res.render("user/wishList", { wishlists });

  } catch (error) {
    console.error("Error in viewWishlist:", error);
    res.status(500).render("error", { error: "Something went wrong" });
  }
};

const viewAccount = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.render("user/signin"); // or show a friendly message
    }
    const user = await Users.findById(userId).populate("orders.orderId").populate("wishlist.productId").populate("cart.productId");

    res.render("user/account", { user });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewContact = async (req, res) => {
  try {
    res.render("user/contact", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewOrderTracking = async (req, res) => {
  try {
    res.render("user/orderTracking", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewProductReturn = async (req, res) => {
  try {
    res.render("user/productReturn", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewPayment = async (req, res) => {
  try {
    res.render("user/phonepay", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewPrivacyPolicy = async (req, res) => {
  try {
    res.render("user/privacypolicy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewTermsofService = async (req, res) => {
  try {
    res.render("user/termsofService", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};
 
const viewRefundPolicy = async (req, res) => {
  try {
    res.render("user/refund-policy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewReturnPolicy = async (req, res) => {
  try {
    res.render("user/return-policy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewShippingPolicy = async (req, res) => {
  try {
    res.render("user/shipping-policy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const getApiCountries = async (req, res) => {
  const countryList = Object.values(countries).map(c => c.name).sort();
  // Remove "India" if present and sort the rest
  const india = "India";
  const otherCountries = countryList.filter(name => name !== india).sort();

  // Put India at the top
  const finalList = [india, ...otherCountries];

  res.json(finalList);
};

const addToWishlist = async (req, res) => {
  const productId = req.query.id;
  const userId = req.session.user; // Assuming this contains the user's MongoDB _id
  console.log(productId, userId);

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if product already exists in wishlist
    const alreadyInWishlist = user.wishlist.some(
      (item) => item.productId.toString() === productId
    );

    if (alreadyInWishlist) {
      return res.status(409).json({ success: false, message: "Product already in wishlist" });
    }

    // Add product to wishlist
    user.wishlist.push({ productId });
    await user.save();

    res.status(200).json({ success: true, message: "Product added to wishlist" });

  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).render("error", { error });
  }
};

const addToCart = async (req, res) => {
  const productId = req.body.productId;
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      // Increase quantity if item already in cart
      existingItem.quantity += 1;
    } else {
      // Add new item with quantity = 1
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();

    return res.status(200).json({ success: true, message: "Product added to cart" });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromCart = async (req, res) => {
  const userId = req.session.user;
  const productId = req.query.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const objectId = new mongoose.Types.ObjectId(productId);

    const result = await Users.findByIdAndUpdate(userId, {
      $pull: { cart: { productId: objectId } }
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "Product removed from cart" });

  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  const userId = req.session.user;
  const productId = req.query.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    await Users.findByIdAndUpdate(userId, {
      $pull: { wishlist: { productId } }
    });

    res.status(200).json({ success: true, message: "Product removed from wishlist" });

  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const returnRequest = async (req, res) => {
  try {
    const { orderId, productName, receivedDate, reason, description } = req.body;
    const userId = req.session.user // Adjust this line based on your session structure

    if (!userId) {
      return res.redirect('/signin');
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "no-image";

    const newRequest = new Requests({
      orderId,
      productName,
      dateOfProduct: receivedDate,
      reason,
      userId,
      image: imagePath,
      description: description || "",
    });

    await newRequest.save();

    return res.status(200).json({
  success: true,
  redirect: '/account' // 👈 include this key
});

  } catch (error) {
    console.error("Return request submission failed:", error);
     return res.status(400).json({success:false});
  }
};



const getApiSearch= async (req, res) => {
  const query = req.query.query.toLowerCase();
  const products = await Products.find(); // Replace with real DB query

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query)
  );

  res.json(filtered);
};

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.session.user; // Or wherever you're storing logged-in user

    const newReview = new Reviews({
      userId,
      productId,
      rating,
      review: comment
    });

    await newReview.save();
    res.redirect(`/product?id=${productId}`);
  } catch (err) {
    console.error("Review Save Error:", err);
    res.status(500).send("Review submission failed.");
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (!user) {
      return res.render("user/forgotPassword", {
        message: "User not found",
        messageType: "danger",
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 600000; // 10 minutes
    await user.save();

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${user.email}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Your Password
            </a>
          </p>
          <p>If you did not request a password reset, please ignore this email. This link will expire in <strong>10 minutes</strong>.</p>
          <p>For security reasons, do not share this email or the reset link with anyone.</p>
          <p>Best Regards,</p>
          <p><strong>Crafted Charm</strong></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err)
        return res.render("user/forgotPassword", {
          message: "Error sending email",
          messageType: "danger",
        });
      return res.render("user/forgotPassword", {
        message: "Reset email sent!",
        messageType: "success",
      });
    });
    // Send email with token
  }catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const resetPassword = async (req, res) => {
  const token = req.query.token;
  const { password, confirmPassword } = req.body;
  console.log(token);

  if (password != confirmPassword) {
    return res.status(400).render("user/resetPassword", {
      message: "Passwords do not match",
      messageType: "danger",
      token,
    });
  }

  try {
    const user = await Users.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).render("user/resetPassword", {
        message: "Invalid or expired token",
        messageType: "danger",
        token,
      });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.render("user/signin", {
      message: "Password reset successful. Login here",
      messageType: "success",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id;

    const order = await Orders.findById(orderId)
      .populate("items.productId")
      .lean();

    const user = await Users.findById(userId).lean();

    if (!order) return res.status(404).render("error", { error: "Order not found" });

    res.render("user/orderDetail", { order, user });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { error: "Something went wrong" });
  }
};

const updateAccountDetails = async (req, res) => {
  try {
    const { name, country, currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match." });
    }

    // Update fields
    if (name) user.name = name;

    if (country) {
      if (!user.address || !user.address[0]) user.address = [{}];
      if (!user.address[0].billing) user.address[0].billing = {};
      user.address[0].billing.country = country;
    }

    if (newPassword) {
      user.password = newPassword; // will be hashed automatically
    }

    await user.save();

    return res.status(200).json({ message: "Account updated successfully." });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

const sendMail = require("../utils/emailSender");
const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong><br/>${message}</p>
    `;

    await sendMail(process.env.EMAIL, `Contact: ${subject}`, htmlContent);

    res.status(200).send("Message sent successfully!");
  } catch (err) {
    console.error("Error in submitContactMessage:", err);
    res.status(500).send("Failed to send message.");
  }
};

const searchProducts = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const regex = new RegExp(searchTerm, "i"); // case-insensitive search

    const products = await Products.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex }
      ]
    });

    res.render("user/searchResults", { products, query: searchTerm });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Server error");
  }
};

const confirmDelivery = async (req, res) => {
    const orderId = req.params.id;
    try {
        await Orders.findByIdAndUpdate(orderId, { status: 'Delivered' });
        res.redirect('/account');
    } catch (err) {
        console.error('Error confirming delivery:', error);
        res.status(500).send('Something went wrong.');
    }
};

const addBillingAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const billingData = {
      name: req.body.name,
      addressLine: req.body.addressLine,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      pincode: req.body.pincode,
      phone: req.body.phone
    };

    await Users.updateOne(
      { _id: userId },
      { $set: { 'address.0.billing': billingData } }, // first address object
      { upsert: true }
    );

    // ✅ Fetch updated user from DB
    const updatedUser = await Users.findById(userId);

    res.status(200).json({
      success: true,
      message: 'Billing address added successfully!',
      billing: updatedUser.address[0].billing
    });
  } catch (err) {
    console.error('Error saving billing address:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await Products.findById(productId);

    if (!product) {
      return res.status(404).render('error', { message: 'Product not found' });
    }

    // Get products from the same category, excluding current product
    const sameCategoryProducts = await Products.find({
      categoryId: product.categoryId,
      _id: { $ne: product._id }
    }).limit(8); // Limit to 8 or whatever you prefer

    res.render('user/product', {
      product,
      sameCategoryProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Server error' });
  }
};

module.exports = {
  viewHomepage,
  viewSignin,
  viewSignup,
  signIn,
  signOut,
  signUp,
  viewForgotPassword,
  viewResetPassword,
  viewShop,
  viewProduct,
  viewCart,
  viewCheckout,
  viewWishlist,
  viewAccount,
  viewContact,
  viewOrderTracking,
  viewProductReturn,
  viewPayment,
  viewPrivacyPolicy,
  viewTermsofService,
  viewRefundPolicy,
  viewReturnPolicy,
  viewShippingPolicy,
  getApiCountries,
  addToCart,
  addToWishlist,
  removeFromCart,
  removeFromWishlist,
  returnRequest,
  createPhonePeOrder,
  status,
  getApiSearch,
  addReview,
  forgotPassword,
  resetPassword,
  viewOrderDetails,
  updateAccountDetails,
  submitContactMessage,
  searchProducts,
  confirmDelivery,
  addBillingAddress,
  getProductById,
}