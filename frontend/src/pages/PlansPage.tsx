import { useEffect, useState } from "react";

import { getPlans } from "../services/plan.service";

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: string;
}

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);

    useEffect(() => {
        const loadPlans = async () => {
            const response = await getPlans();

            setPlans(response.data);
        };

        loadPlans();
    }, []);

    return (
        <div>
            <h1>Plans</h1>

            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {plans.map((plan) => (
                        <tr key={plan.id}>
                            <td>{plan.name}</td>
                            <td>{plan.description}</td>
                            <td>${plan.price}</td>
                            <td>{plan.durationDays} days</td>
                            <td>{plan.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}