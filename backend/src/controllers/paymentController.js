const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const Razorpay = require('razorpay');
const crypto = require('crypto');

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

exports.createOrder = async (req, res) => {
  try {
    const { rideId } = req.body;
    
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_KEY_ID') {
        return res.status(400).json({ message: 'Razorpay keys not configured in backend .env' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: ride.fare * 100,
      currency: "INR",
      receipt: `receipt_${rideId}`
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");

    res.json({
        order,
        key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).send(error);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      rideId
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const ride = await Ride.findByIdAndUpdate(rideId, { 
        paymentStatus: 'Paid',
        status: 'Completed' 
      }, { new: true });
      
      const payment = await Payment.create({
        rideId,
        passengerId: ride.passengerId,
        driverId: ride.driverId,
        amount: ride.fare,
        method: 'UPI',
        status: 'Completed',
        transactionId: razorpay_payment_id
      });

      const { getIO } = require('../sockets/socketManager');
      const io = getIO();
      if (io) {
        io.to(ride.passengerId.toString()).emit('ride:updated', ride);
        if (ride.driverId) {
            io.to(ride.driverId.toString()).emit('ride:updated', ride);
        }
      }

      return res.status(200).json({ message: "Payment verified successfully", payment });
    } else {
      return res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).send(error);
  }
};
