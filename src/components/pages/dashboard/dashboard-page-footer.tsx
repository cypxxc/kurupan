"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Bug,
  ClipboardList,
  History,
  Layers3,
  RotateCcw,
  Shield,
  User,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLE_LABELS = {
  borrower: "ผู้ยืม",
  staff: "เจ้าหน้าที่",
  admin: "ผู้ดูแลระบบ",
} as const;

const QUICK_START_STEPS = [
  "เริ่มจากหน้า Dashboard เพื่อตรวจดูภาพรวมของคำขอที่รอดำเนินการ รายการที่กำลังยืม และการแจ้งเตือนล่าสุด",
  "ไปที่หน้า ครุภัณฑ์ เพื่อค้นหารายการที่พร้อมใช้งาน ตรวจสอบหมวดหมู่ สถานที่ และจำนวนคงเหลือก่อนสร้างคำขอ",
  "สร้างคำขอยืมที่หน้า คำขอยืม พร้อมตรวจสอบสถานะคำขอเป็นระยะจนกว่าจะได้รับการอนุมัติหรือมีการเปลี่ยนแปลง",
  "เมื่อมีการคืนรายการ เจ้าหน้าที่หรือผู้ดูแลสามารถบันทึกการคืนได้ที่หน้า การคืน และติดตามย้อนหลังได้จากหน้าประวัติ",
] as const;

const ROLE_GUIDES = [
  {
    key: "borrower",
    title: "ผู้ยืม",
    description: "เหมาะสำหรับผู้ใช้งานทั่วไปที่ต้องการยื่นคำขอยืมและติดตามสถานะของตนเอง",
    icon: User,
    items: [
      "ค้นหารายการครุภัณฑ์ที่พร้อมยืม",
      "สร้างคำขอยืมใหม่และตรวจสอบสถานะ",
      "ติดตามรายการที่กำลังยืมและกำหนดคืน",
    ],
  },
  {
    key: "staff",
    title: "เจ้าหน้าที่",
    description: "ใช้ดูคำขอที่รออนุมัติ จัดการครุภัณฑ์ และบันทึกรายการคืนในแต่ละวัน",
    icon: Shield,
    items: [
      "อนุมัติหรือปฏิเสธคำขอยืม",
      "เพิ่มและแก้ไขข้อมูลครุภัณฑ์",
      "บันทึกการคืนและตรวจสอบผลการคืน",
    ],
  },
  {
    key: "admin",
    title: "ผู้ดูแลระบบ",
    description: "มีสิทธิ์ครบถ้วนสำหรับดูแลข้อมูล ผู้ใช้ และติดตามภาพรวมของระบบทั้งหมด",
    icon: Users,
    items: [
      "ทำงานทุกอย่างได้เหมือนเจ้าหน้าที่",
      "จัดการสิทธิ์และสถานะผู้ใช้",
      "ตรวจสอบประวัติการทำรายการทั้งระบบ",
    ],
  },
] as const;

const WORKFLOW_STEPS = [
  {
    title: "ค้นหาและตรวจสอบรายการ",
    description: "ดูข้อมูลครุภัณฑ์ สถานะ และจำนวนคงเหลือก่อนเริ่มยื่นคำขอ",
    icon: Layers3,
  },
  {
    title: "สร้างคำขอยืม",
    description: "เลือกครุภัณฑ์ที่ต้องการ ระบุจำนวน และส่งคำขอเข้าสู่ระบบ",
    icon: ClipboardList,
  },
  {
    title: "รออนุมัติและติดตามผล",
    description: "เจ้าหน้าที่หรือผู้ดูแลจะพิจารณาคำขอ และผู้ยืมสามารถติดตามสถานะได้จากหน้าคำขอ",
    icon: Shield,
  },
  {
    title: "บันทึกการคืน",
    description: "เมื่อครุภัณฑ์ถูกส่งคืน ระบบรองรับทั้งคืนครบและคืนบางส่วนพร้อมระบุสภาพรายการ",
    icon: RotateCcw,
  },
  {
    title: "ตรวจสอบย้อนหลัง",
    description: "ใช้หน้าประวัติและหน้าการคืนเพื่อตรวจสอบรายการย้อนหลังและการเปลี่ยนแปลงสำคัญ",
    icon: History,
  },
] as const;

export function DashboardPageFooter() {
  const { user } = useAuth();
  const currentRoleLabel = user ? ROLE_LABELS[user.role] : null;

  return (
    <Dialog>
      <footer className="surface-panel mt-2 overflow-hidden border-border/80">
        <div className="grid gap-px bg-border/70 lg:grid-cols-[1.2fr_1fr_0.8fr]">
          <section className="bg-card px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Layers3 className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  ระบบ
                </p>
                <div className="space-y-1">
                  <p className="text-lg font-semibold tracking-tight text-foreground">Kurupan</p>
                  <p className="text-sm leading-6 text-muted-foreground">ระบบยืม-คืนครุภัณฑ์</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card px-5 py-5 sm:px-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              ช่วยเหลือ
            </p>
            <div className="mt-4 grid gap-3">
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto justify-between rounded-sm border border-border/80 bg-accent/30 px-3 py-3 text-sm hover:bg-accent/60"
                  />
                }
              >
                <span className="flex items-center gap-2 text-foreground">
                  <BookOpenText className="size-4 text-primary" />
                  คู่มือ
                </span>
                <span className="text-xs text-muted-foreground">เปิดดู</span>
              </DialogTrigger>
              <Link
                href="/dashboard#report-issue"
                className="group flex items-center justify-between rounded-sm border border-border/80 bg-accent/30 px-3 py-3 text-sm transition-colors hover:bg-accent/60"
              >
                <span className="flex items-center gap-2 text-foreground">
                  <Bug className="size-4 text-primary" />
                  แจ้งปัญหา
                </span>
                <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  ส่งเรื่อง
                </span>
              </Link>
            </div>
          </section>

          <section className="bg-card px-5 py-5 sm:px-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              เวอร์ชัน
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">v0.1.0</p>
                <p className="mt-1 text-sm text-muted-foreground">Current dashboard build</p>
              </div>
              <div className="rounded-sm border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Updated <time dateTime="2026-04-09">2026-04-09</time>
              </div>
            </div>
          </section>
        </div>
      </footer>

      <DialogContent className="top-3 left-1/2 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] max-w-[56rem] -translate-x-1/2 translate-y-0 overflow-hidden p-0 sm:top-4 sm:w-full sm:max-w-[56rem] sm:translate-y-0">
        <DialogHeader className="border-b border-border bg-card px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>คู่มือการใช้งาน Kurupan</DialogTitle>
            {currentRoleLabel ? <Badge variant="outline">บทบาทปัจจุบัน: {currentRoleLabel}</Badge> : null}
          </div>
          <DialogDescription>
            ภาพรวมการใช้งานระบบยืม-คืนครุภัณฑ์สำหรับผู้ยืม เจ้าหน้าที่ และผู้ดูแลระบบ
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(min(90vh,52rem)-8.5rem)] gap-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">เริ่มต้นใช้งาน</p>
              <p className="text-sm text-muted-foreground">
                ถ้าพึ่งเริ่มใช้งาน ให้ไล่ตามลำดับนี้ก่อนเพื่อเห็นภาพรวมของระบบได้เร็วที่สุด
              </p>
            </div>
            <div className="grid gap-3">
              {QUICK_START_STEPS.map((step, index) => (
                <div key={step} className="rounded-sm border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-foreground">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">สิทธิ์และหน้าที่ตามบทบาท</p>
              <p className="text-sm text-muted-foreground">
                ระบบแสดงข้อมูลและเมนูไม่เหมือนกันตามสิทธิ์ของผู้ใช้งานแต่ละประเภท
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {ROLE_GUIDES.map((guide) => {
                const Icon = guide.icon;
                const isActiveRole = user?.role === guide.key;

                return (
                  <div
                    key={guide.key}
                    className="rounded-sm border border-border bg-card px-4 py-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <p className="font-medium text-foreground">{guide.title}</p>
                      </div>
                      {isActiveRole ? <Badge>กำลังใช้งาน</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.description}</p>
                    <div className="mt-4 space-y-2">
                      {guide.items.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                          <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">ลำดับงานหลักของระบบ</p>
              <p className="text-sm text-muted-foreground">
                เส้นทางการใช้งานหลักจะเริ่มจากการค้นหารายการ ไปจนถึงการบันทึกคืนและตรวจสอบย้อนหลัง
              </p>
            </div>
            <div className="grid gap-3">
              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-sm border border-border bg-card px-4 py-4"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <DialogFooter className="px-5 py-4 sm:px-6">
          <DialogClose render={<Button variant="outline" />}>ปิด</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
