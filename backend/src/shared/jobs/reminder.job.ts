import cron from "node-cron";
import Subscription from "../../modules/subscriptions/subscription.model";
import { SubscriptionStatus } from "../../modules/subscriptions/subscription.types";
import Payment from "../../modules/payments/payment.model";
import { PaymentStatus } from "../../modules/payments/payment.types";
import Member from "../../modules/members/member.model";
import { sendMail } from "../utils/mail.util";

const DAYS_BEFORE_EXPIRY = 3;

const getMemberEmail = async (memberId: string): Promise<string | null> => {
    const member = await Member.findById(memberId).select("email firstName lastName");
    if (!member || !member.email) return null;
    return member.email;
};

const sendExpiringReminders = async () => {
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + DAYS_BEFORE_EXPIRY);
    const startOfDay = new Date(alertDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(alertDate.setHours(23, 59, 59, 999));

    const subscriptions = await Subscription.find({
        status: SubscriptionStatus.ACTIVE,
        endDate: { $gte: startOfDay, $lte: endOfDay },
    }).populate("planId", "name");

    for (const sub of subscriptions) {
        const memberEmail = await getMemberEmail(sub.memberId.toString());
        if (!memberEmail) continue;
        const planName = (sub.planId as any)?.name ?? "Plan";
        const endDate = sub.endDate.toLocaleDateString("es-MX", {
            day: "2-digit", month: "long", year: "numeric",
        });
        await sendMail(
            memberEmail,
            "Tu suscripción en ZenithGym está por vencer",
            `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a1a;">¡Tu suscripción está por vencer!</h2>
                    <p style="color: #555; font-size: 14px; line-height: 1.6;">
                        Tu plan <strong>${planName}</strong> vence el <strong>${endDate}</strong>.
                    </p>
                    <p style="color: #555; font-size: 14px; line-height: 1.6;">
                        Renueva ahora para seguir disfrutando de todas las instalaciones y servicios de ZenithGym.
                    </p>
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/subscriptions"
                       style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none;
                              padding: 10px 20px; border-radius: 8px; font-size: 13px; margin-top: 12px;">
                        Renovar suscripción
                    </a>
                    <p style="color: #bbb; font-size: 11px; margin-top: 24px;">
                        ZenithGym · Panel de administración
                    </p>
                </div>
            `
        );
    }
};

const sendPendingPaymentReminders = async () => {
    const payments = await Payment.find({ status: PaymentStatus.PENDING }).populate("subscriptionId", "endDate");

    for (const payment of payments) {
        const memberEmail = await getMemberEmail(payment.memberId.toString());
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
            `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a1a;">Pago pendiente</h2>
                    <p style="color: #555; font-size: 14px; line-height: 1.6;">
                        Tienes un saldo pendiente de <strong>$${amount}</strong>
                        ${dueDate ? `con fecha de vencimiento el <strong>${dueDate}</strong>.` : "."}
                    </p>
                    <p style="color: #555; font-size: 14px; line-height: 1.6;">
                        Realiza tu pago para mantener tu suscripción activa sin interrupciones.
                    </p>
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/payments"
                       style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none;
                              padding: 10px 20px; border-radius: 8px; font-size: 13px; margin-top: 12px;">
                        Revisar pagos
                    </a>
                    <p style="color: #bbb; font-size: 11px; margin-top: 24px;">
                        ZenithGym · Panel de administración
                    </p>
                </div>
            `
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
