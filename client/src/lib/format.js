export const inr = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
export const currentMonth = () => new Date().toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Kolkata" }).replace("/", "-");
export const dateToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Kolkata",year:"numeric", month:"2-digit",day:"2-digit" }).formatToParts(new Date());
  const v = (type) => parts.find(p=>p.type===type).value;
  return `${v("year")}-${v("month")}-${v("day")}`;
};
export const categoryLabels = {food:"Food",transport:"Transport",utilities:"Utilities",entertainment:"Entertainment",other:"Other"};
export const categoryEmoji = {food:"🍕",transport:"🚕",utilities:"💡",entertainment:"🎮",other:"✨"};
