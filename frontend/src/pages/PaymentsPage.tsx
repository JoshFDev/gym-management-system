import { useEffect, useState } from "react";

import { getPayments } from "../services/payment.service";

interface Payment {
    id: string;

    member: {
        fullName: string;
    };

    subscription: {
        startDate: string;
        endDate: string;
        status: string;
    };

    amount: number;
    method: string;
    status: string;
    paidAt: string;
    notes?: string;
}

export default function PaymentsPage() {
    const [payments, setPayments] =
        useState<Payment[]>([]);

    useEffect(() => {
        const loadPayments = async () => {
            const response = await getPayments();

            setPayments(response.data);
        };

        loadPayments();
    }, []);

    return (
        <div>
            <h1>Payments</h1>

            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Paid At</th>
                        <th>Subscription End</th>
                        <th>Notes</th>
                    </tr>
                </thead>

                <tbody>
                    {payments.map((payment) => (
                        <tr key={payment.id}>
                            <td>{payment.member.fullName}</td>
                            <td>${payment.amount}</td>
                            <td>{payment.method}</td>
                            <td>{payment.status}</td>
                            <td>
                                {new Date(
                                    payment.paidAt
                                ).toLocaleString()}
                            </td>
                            <td>
                                {new Date(
                                    payment.subscription.endDate
                                ).toLocaleDateString()}
                            </td>
                            <td>{payment.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}