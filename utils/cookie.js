export function setCookie(req = null, res, cookieName, cookieValue) {
  const options = {
    httpOnly: true,
    signed: true,
    sameSite: "none",
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie(cookieName, cookieValue, options);
}
export function clearCookie(req = null, res, cookieName) {
  const options = {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    // secure: process.env.NODE_ENV === "production",
    // sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  // Add domain if request object is provided
  if (req && req.hostname) {
    options.domain = req.hostname;
  }

  res.clearCookie(cookieName, options);
}
