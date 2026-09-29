exports.ok = (res, data, meta = {}, status = 200) =>
  res.status(status).json({ success: true, data, meta });
