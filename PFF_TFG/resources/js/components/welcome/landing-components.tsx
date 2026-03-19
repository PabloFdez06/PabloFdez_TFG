import type { ReactNode } from 'react';

export interface MoodleCourse {
    name: string;
    progress: number;
    color: string;
}

export interface FeatureItem {
    id: string;
    title: string;
    description: string;
    highlighted?: boolean;
    icon: ReactNode;
}

export interface StepItem {
    id: string;
    title: string;
    description: string;
}

interface StatCardProps {
    value: string;
    label: string;
    highlighted?: boolean;
    scope: 'phone' | 'web';
}

export function StatCard({ value, label, highlighted = false, scope }: StatCardProps) {
    if (scope === 'phone') {
        return (
            <article className="p-stat">
                <span className={`p-stat-v ${highlighted ? 'pur' : ''}`}>{value}</span>
                <span className="p-stat-l">{label}</span>
            </article>
        );
    }

    return (
        <article className="wb-sc">
            <span className={`wb-sv ${highlighted ? 'p' : ''}`}>{value}</span>
            <span className="wb-sl">{label}</span>
        </article>
    );
}

interface CourseProgressRowProps {
    course: MoodleCourse;
    scope: 'phone' | 'web';
}

export function CourseProgressRow({ course, scope }: CourseProgressRowProps) {
    if (scope === 'phone') {
        return (
            <article className="p-course">
                <span className="p-cbar" style={{ background: course.color }} />
                <span className="p-cdata">
                    <span className="p-ctitle">{course.name}</span>
                    <span className="p-ctrack">
                        <span className="p-cfill" style={{ width: `${course.progress}%`, background: course.color }} />
                    </span>
                </span>
                <span className="p-cpct">{course.progress}%</span>
            </article>
        );
    }

    return (
        <article className="wb-cr">
            <span className="wb-cn">{course.name}</span>
            <span className="wb-bt"><span className="wb-bf" style={{ width: `${course.progress}%`, background: course.color }} /></span>
            <span className="wb-bp">{course.progress}%</span>
        </article>
    );
}

interface FeatureCardProps {
    feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
    return (
        <article className={`feat ${feature.highlighted ? 'f-tall' : ''}`}>
            <span className="feat-top" />
            <span className="feat-n">{feature.id}</span>
            <span className="feat-ico">{feature.icon}</span>
            <h3 className="feat-h">{feature.title}</h3>
            <p className="feat-d">{feature.description}</p>
        </article>
    );
}

interface StepCardProps {
    step: StepItem;
}

export function StepCard({ step }: StepCardProps) {
    return (
        <article className="step">
            <p className="step-n">{step.id}</p>
            <h3 className="step-h">{step.title}</h3>
            <p className="step-d">{step.description}</p>
        </article>
    );
}

interface MobileNavItemProps {
    label: string;
    active?: boolean;
    children: ReactNode;
}

export function MobileNavItem({ label, active = false, children }: MobileNavItemProps) {
    return (
        <span className={`p-nav-item ${active ? 'on' : ''}`}>
            {children}
            <span className="p-nav-lbl">{label}</span>
        </span>
    );
}
