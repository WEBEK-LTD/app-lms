/**
 * The old marketplace (Phase 9.5, ended in Phase 72): shops sold through
 * Yallapp's own payment account for a commission. Yallapp never collects
 * payments for its clients now, and nobody can join; what is left is what
 * the team needs to settle orders paid before (release a shop's share,
 * refund): who a share is transferred to.
 */

/** 37 Who the team pays a shop's share to, when Yallapp's account was with Kashier or Fawaterk. */
export interface PayoutDetails {
  /** The shop's name, as the payee. */
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  /** Any country's IBAN (Egyptian ones start with EG), without spaces. */
  iban: string;
}
