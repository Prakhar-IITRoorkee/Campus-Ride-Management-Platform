const Payment = require('../models/Payment');
const Ride = require('../models/Ride');

exports.processPayment = async (req, res) => {
  try {
    const { rideId, amount, method } = req.body;
    
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.paymentStatus === 'Completed') return res.status(400).json({ message: 'Payment already completed' });

    const payment = await Payment.create({
      rideId,
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      amount,
      method,
      status: 'Completed',
      transactionId: `TXN_${Date.now()}`
    });

    ride.paymentStatus = 'Completed';
    await ride.save();

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
