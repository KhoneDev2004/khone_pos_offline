'use client';

import React, { useState, useEffect } from 'react';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { Clock } from 'lucide-react';

export default function ClockPage() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const dateStr = time.toLocaleDateString('lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <POSPageWrapper title="ນາລິກາ" icon={<Clock size={20} />}>
            <div className="pos-clock-container">
                <div className="pos-clock-display">
                    <div className="pos-clock-time">
                        <span className="pos-clock-digit">{hours}</span>
                        <span className="pos-clock-separator">:</span>
                        <span className="pos-clock-digit">{minutes}</span>
                        <span className="pos-clock-separator">:</span>
                        <span className="pos-clock-digit">{seconds}</span>
                    </div>
                    <div className="pos-clock-date">{dateStr}</div>
                </div>

                <div className="pos-clock-shifts">
                    <h3>ກະທຳງານ</h3>
                    <div className="pos-clock-shift-cards">
                        <div className="pos-clock-shift active">
                            <div className="pos-clock-shift-label">ກະເຊົ້າ</div>
                            <div className="pos-clock-shift-time">06:00 - 14:00</div>
                        </div>
                        <div className="pos-clock-shift">
                            <div className="pos-clock-shift-label">ກະບ່າຍ</div>
                            <div className="pos-clock-shift-time">14:00 - 22:00</div>
                        </div>
                        <div className="pos-clock-shift">
                            <div className="pos-clock-shift-label">ກະກາງຄືນ</div>
                            <div className="pos-clock-shift-time">22:00 - 06:00</div>
                        </div>
                    </div>
                </div>
            </div>
        </POSPageWrapper>
    );
}
