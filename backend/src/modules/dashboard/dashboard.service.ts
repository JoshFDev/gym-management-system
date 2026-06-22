import Member from "../members/member.model";
import Subscription from "../subscriptions/subscription.model";
import Attendance from "../attendance/attendance.model";
import Payment from "../payments/payment.model";
import { PaymentStatus } from "../payments/payment.types";

export const getDashboardStats = async () => {

    const totalMembers = await Member.countDocuments();

    const activeSubscriptions =
        await Subscription.countDocuments({

        });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendances =
        await Attendance.countDocuments({
            checkInAt: {
                $gte: todayStart,
                $lte: todayEnd,
            },
        });

    const payments = await Payment.find({
        status: PaymentStatus.PAID,
    });

    const totalRevenue = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
    );

    return {
        totalMembers,
        activeSubscriptions,
        todayAttendances,
        totalRevenue,
    };
};