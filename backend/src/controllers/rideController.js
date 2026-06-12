const Ride = require('../models/Ride');
const User = require('../models/User');
const { getIO } = require('../sockets/socketManager');

exports.requestRide = async (req, res) => {
  try {
    const { pickup, destination, scheduledTime, isDaily } = req.body;
    
    const simulatedFare = 10;

    let primaryRide;
    const io = getIO();

    if (isDaily && scheduledTime) {
      const ridesToCreate = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(scheduledTime);
        d.setDate(d.getDate() + i);
        ridesToCreate.push({
          passengerId: req.user.id,
          pickup,
          destination,
          status: 'Requested',
          scheduledTime: d,
          isDaily: true,
          fare: simulatedFare
        });
      }
      const createdRides = await Ride.insertMany(ridesToCreate);
      primaryRide = createdRides[0];
      
      await primaryRide.populate('passengerId', 'name');
      io.to('drivers').emit('ride:requested', primaryRide);
      
      return res.status(201).json(createdRides);
    } else {
      primaryRide = await Ride.create({
        passengerId: req.user.id,
        pickup,
        destination,
        status: 'Requested',
        scheduledTime: scheduledTime || null,
        isDaily: false,
        fare: simulatedFare
      });
      await primaryRide.populate('passengerId', 'name');
      io.to('drivers').emit('ride:requested', primaryRide);
      return res.status(201).json(primaryRide);
    }
  } catch (error) {
    console.error("Ride request error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    
    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: 'Requested' },
      { 
        status: 'Accepted', 
        driverId: req.user.id 
      },
      { new: true }
    ).populate('passengerId driverId', 'name vehicle currentLocation');

    if (!ride) {
      return res.status(400).json({ message: 'Ride no longer available' });
    }

    const io = getIO();
    io.to(ride.passengerId._id.toString()).emit('ride:accepted', ride);
    io.to('drivers').emit('ride:updated', ride);

    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.status = status;
    await ride.save();
    await ride.populate('passengerId driverId', 'name vehicle currentLocation');

    const io = getIO();
    io.to(ride.passengerId._id.toString()).emit('ride:updated', ride);

    if (status === 'Completed') {
      await User.findByIdAndUpdate(ride.driverId, { $inc: { totalRides: 1 } });
      await User.findByIdAndUpdate(ride.passengerId, { $inc: { totalRides: 1 } });
    }

    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const query = req.user.role === 'passenger' 
      ? { passengerId: req.user.id }
      : { driverId: req.user.id };

    const rides = await Ride.find(query).sort('-createdAt').populate('passengerId driverId', 'name vehicle currentLocation');
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rateRide = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== 'Completed') {
      return res.status(400).json({ message: 'Ride must be completed to rate' });
    }

    ride.rating = rating;
    ride.feedback = feedback;
    await ride.save();

    const driver = await User.findById(ride.driverId);
    const newTotal = driver.totalRatings + 1;
    const newAverage = ((driver.averageRating * driver.totalRatings) + rating) / newTotal;
    
    driver.totalRatings = newTotal;
    driver.averageRating = newAverage;
    await driver.save();

    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
