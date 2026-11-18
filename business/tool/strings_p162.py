"""162 Build your bouquet: a bouquet the customer built in the app, shown as one in an order (its stems, its wrap, its card and the card's words)."""

S = [
("bouquetWrap", "Wrap", "التغليف", "Ambalaj"),
("bouquetCard", "Card", "البطاقة", "Kart"),
("bouquetMessage", "Card message: {message}", "رسالة البطاقة: {message}", "Kart mesajı: {message}"),
]

P = [
("bouquetGroup", "stems", "Bouquet · {stems, plural, =1{1 stem} other{{stems} stems}}", "باقة · {stems, plural, =0{بلا سيقان} =1{ساق واحدة} =2{ساقان} few{{stems} سيقان} many{{stems} ساقًا} other{{stems} ساق}}", "Buket · {stems, plural, other{{stems} dal}}"),
]
