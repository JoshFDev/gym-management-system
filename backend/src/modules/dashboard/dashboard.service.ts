import Member from "../members/member.model";
import Subscription from "../subscriptions/subscription.model";
import Attendance from "../attendance/attendance.model";
import Payment from "../payments/payment.model";
import { MembershipStatus } from "../members/member.types";
import { SubscriptionStatus } from "../subscriptions/subscription.types";
import { PaymentStatus } from "../payments/payment.types";

const REVENUE_GOAL = 30_000;

export const getDashboardStats = async () => {

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const [
        totalMembers,
        membersThisMonth,
        activeSubscriptions,
        expiringSubscriptions,
        todayAttendances,
        yesterdayAttendances,
        paymentsThisMonth,
        paymentsPrevMonth,
        pendingPayments,
    ] = await Promise.all([

        Member.countDocuments({ membershipStatus: MembershipStatus.ACTIVE }),

        Member.countDocuments({
            createdAt: { $gte: monthStart, $lte: monthEnd },
        }),

        Subscription.countDocuments({ status: SubscriptionStatus.ACTIVE }),

        Subscription.countDocuments({
            status: SubscriptionStatus.ACTIVE,
            endDate: { $gte: now, $lte: in7Days },
        }),

        Attendance.countDocuments({
            checkInAt: { $gte: todayStart, $lte: todayEnd },
        }),

        Attendance.countDocuments({
            checkInAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
        }),

        Payment.find({
            status: PaymentStatus.PAID,
            paidAt: { $gte: monthStart, $lte: monthEnd },
        }),

        Payment.find({
            status: PaymentStatus.PAID,
            paidAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
        }),

        Payment.countDocuments({ status: PaymentStatus.PENDING }),
    ]);

    const totalRevenue = paymentsThisMonth.reduce(
        (sum, p) => sum + p.amount, 0
    );

    const prevRevenue = paymentsPrevMonth.reduce(
        (sum, p) => sum + p.amount, 0
    );

    const revenueGrowth = prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : null;

    const attendanceDelta = todayAttendances - yesterdayAttendances;

    return {
        totalMembers,
        activeSubscriptions,
        todayAttendances,
        totalRevenue,
        memberGrowth:      membersThisMonth,
        revenueGrowth,
        attendanceDelta,
        expiringThisMonth: expiringSubscriptions,
        pendingPayments,
        revenueGoal:       REVENUE_GOAL,
    };
};