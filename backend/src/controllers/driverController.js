const User = require('../models/User');
const { getIO } = require('../sockets/socketManager');

exports.updateAvailability = async (req, res) => {
  try {
    const { isOnline, currentLocation } = req.body;
    
    const updateData = { isOnline };
    if (currentLocation) {
      updateData.currentLocation = currentLocation;
    }

    const driver = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    // Broadcast driver availability update
    const io = getIO();
    io.emit('driver:availability', driver);

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver', isOnline: true }).select('-password');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
