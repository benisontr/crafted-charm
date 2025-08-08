const isLogin = (req, res, next) => {
  if (req.session.user || req.isAuthenticated?.()) {
    return next();
  }
  req.session.originalUrl = req.originalUrl; // Save the original page for redirection
  return res.redirect("/signin");
};

const isLogout = (req, res, next) => {
  if (req.session.user || req.isAuthenticated?.()) {
    return res.redirect("/");
  }
  return next();
};

module.exports = { isLogin, isLogout };
