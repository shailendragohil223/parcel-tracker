// Questions answered on each courier page; also used for that page's FAQPage structured data
// (server/src/seo.js), so the markup always matches what visitors see.
export function courierFaq(c) {
  const faq = [
    {
      q: `How do I track a ${c.name} parcel?`,
      a: `Enter your ${c.name} ${c.numberName} in the box above and press Track. Track My Ship shows the latest status published by ${c.name}, the tracking history and the route on a map.`,
    },
    {
      q: `What does a ${c.name} tracking number look like?`,
      a: `The ${c.numberName} is ${c.format}. You'll find it on the booking receipt, or in the shipping SMS or email from the seller.`,
    },
    {
      q: `Who do I contact about a delayed or damaged ${c.name} parcel?`,
      a: `${c.name} or the sender. They hold the parcel and can act on it; Track My Ship only shows the tracking information ${c.name} publishes.`,
    },
  ];
  return faq;
}
