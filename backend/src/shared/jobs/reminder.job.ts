import cron from "node-cron";
import Subscription from "../../modules/subscriptions/subscription.model";
import { SubscriptionStatus } from "../../modules/subscriptions/subscription.types";
import Payment from "../../modules/payments/payment.model";
import { PaymentStatus } from "../../modules/payments/payment.types";
import Member from "../../modules/members/member.model";
import { sendMail, buildEmailHtml, GOLD } from "../utils/mail.util";

const DAYS_BEFORE_EXPIRY = 3;

const sendExpiringReminders = async () => {
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + DAYS_BEFORE_EXPIRY);
    const startOfDay = new Date(alertDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(alertDate.setHours(23, 59, 59, 999));

    const subscriptions = await Subscription.find({
        status: SubscriptionStatus.ACTIVE,
        endDate: { $gte: startOfDay, $lte: endOfDay },
    }).populate("planId", "name");

    const memberIds = subscriptions.map((s) => s.memberId);
    const members = await Member.find({ _id: { $in: memberIds } }).select("email firstName lastName");
    const emailMap = new Map(members.filter((m) => m.email).map((m) => [m._id.toString(), m.email as string]));

    for (const sub of subscriptions) {
        const memberEmail = emailMap.get(sub.memberId.toString());
        if (!memberEmail) continue;
        const planName = (sub.planId as any)?.name ?? "Plan";
        const endDate = sub.endDate.toLocaleDateString("es-MX", {
            day: "2-digit", month: "long", year: "numeric",
        });
        await sendMail(
            memberEmail,
            "Tu suscripción en ZenithGym está por vencer",
            buildEmailHtml(`
                <p style="color: #333; font-size: 15px; margin: 0 0 12px;">¡Tu suscripción está por vencer!</p>
                <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 4px;">
                    Tu plan <strong>${planName}</strong> vence el <strong>${endDate}</strong>.
                </p>
                <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 18px;">
                    Renueva ahora para seguir disfrutando de todas las instalaciones.
                </p>
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/subscriptions"
                       style="display: inline-block; background: ${GOLD}; color: #fff; text-decoration: none;
                              padding: 10px 22px; border-radius: 7px; font-size: 13px; font-weight: 600;">
                        Renovar suscripción
                    </a>
                </div>
            `)
        );
    }
};

const sendPendingPaymentReminders = async () => {
    const payments = await Payment.find({ status: PaymentStatus.PENDING }).populate("subscriptionId", "endDate");

    const memberIds = payments.map((p) => p.memberId);
    const members = await Member.find({ _id: { $in: memberIds } }).select("email firstName lastName");
    const emailMap = new Map(members.filter((m) => m.email).map((m) => [m._id.toString(), m.email as string]));

    for (const payment of payments) {
        const memberEmail = emailMap.get(payment.memberId.toString());
        if (!memberEmail) continue;
        const amount = payment.amount.toLocaleString("es-MX");
        const dueDate = payment.paidAt
            ? new Date(payment.paidAt).toLocaleDateString("es-MX", {
                  day: "2-digit", month: "long", year: "numeric",
              })
            : null;
        await sendMail(
            memberEmail,
            "Tienes un pago pendiente en ZenithGym",
            buildEmailHtml(`
                <p style="color: #333; font-size: 15px; margin: 0 0 12px;">Tienes un pago pendiente</p>
                <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 4px;">
                    Saldo pendiente: <strong>$${amount}</strong>
                    ${dueDate ? `con vencimiento el <strong>${dueDate}</strong>.` : "."}
                </p>
                <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 18px;">
                    Realiza tu pago para mantener tu suscripción activa.
                </p>
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/payments"
                       style="display: inline-block; background: ${GOLD}; color: #fff; text-decoration: none;
                              padding: 10px 22px; border-radius: 7px; font-size: 13px; font-weight: 600;">
                        Revisar pagos
                    </a>
                </div>
            `)
        );
    }
};

export const startReminderJob = () => {
    cron.schedule("0 8 * * *", async () => {
        try {
            await sendExpiringReminders();
        } catch (err) {
            console.error("Error sending expiring reminders:", err);
        }
        try {
            await sendPendingPaymentReminders();
        } catch (err) {
            console.error("Error sending payment reminders:", err);
        }
    });
};
