import nodemailer from "nodemailer";

export const GOLD = "#D4AF37";

interface Attachment {
    filename: string;
    content?: string | Buffer;
    path?: string;
    cid?: string;
}

export const buildEmailHtml = (bodyHtml: string) => `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #ECEBE9;">
        <div style="background: #070707; padding: 24px 28px 18px; text-align: center; border-bottom: 2px solid ${GOLD};">
            <img src="https://i.imgur.com/uFl36AQ.png" alt="ZenithGym" style="height: 40px;" />
            <h1 style="color: ${GOLD}; margin: 10px 0 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">ZENITHGYM</h1>
        </div>
        <div style="padding: 28px 28px 20px;">
            ${bodyHtml}
        </div>
        <div style="background: #F8F8F7; padding: 14px 28px; text-align: center; border-top: 1px solid #ECEBE9;">
            <p style="margin: 0; color: #bbb; font-size: 11px;">
                ZenithGym &copy; ${new Date().getFullYear()} &middot; Todos los derechos reservados
            </p>
        </div>
    </div>
`;

export const sendMail = async (
    to: string,
    subject: string,
    html: string,
    attachments?: Attachment[]
) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"ZenithGym" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments,
    });
};