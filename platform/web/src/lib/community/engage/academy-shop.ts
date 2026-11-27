import { coursePriceForCheckout, grantCourseAccess } from "../academy/service";
import type { CourseShop } from "./checkout";
import { tenantOf } from "./context";

/**
 * 233 Area B's academy as the checkout reads it (lib/community/academy):
 * a published course's price (in US dollars, as Studio Market's: the
 * gateway charges pounds at the team's rate where it takes pounds), whether
 * the member has it already, and access given once paid (`bought`, its ref
 * the order). A free course is opened from its page, never bought; one with
 * no price yet can't be bought.
 */
export const academyShop: CourseShop = {
  async price(ctx, courseId) {
    const academy = ctx.store.qa.academy;
    const tenant = tenantOf(ctx);
    const priced = await coursePriceForCheckout(academy, tenant, courseId);
    if (priced) return { title: priced.title, slug: priced.slug, amountMinor: priced.priceMinor, currency: priced.currency, free: false };
    const course = await academy.getCourse(courseId);
    if (!course || course.tenant !== tenant || course.status !== "published") return null;
    return { title: course.title, slug: course.slug, amountMinor: 0, currency: course.currency ?? "USD", free: course.free };
  },
  async owned(ctx, memberId, courseId) {
    return (await ctx.store.qa.academy.accessOf(memberId, [courseId])).length > 0;
  },
  async grant(ctx, input) {
    await grantCourseAccess(ctx.store.qa.academy, { tenant: input.tenant, memberId: input.memberId, courseId: input.courseId, source: "bought", ref: input.ref }, ctx.now);
  },
};
