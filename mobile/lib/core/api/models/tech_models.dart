import 'json.dart';

/// 211 An electronics, mobiles or computers shop's parts (the hosted
/// API's lib/selling/specs.ts and tech.ts): a product's specifications,
/// trade-in (`StoreConfig.trade_in`), Build your PC (`StoreConfig.pc_builder`)
/// and the Studio tech elements (`StudioNode.tech`, `tech_served`).

/// One specification of a product: its key when Yallapp knows it (`ram`,
/// `socket`…), its name already in the app's language, and its value.
class ProductSpec {
  const ProductSpec({this.key, required this.label, required this.value});

  static ProductSpec? tryParse(Json json) {
    final label = optString(json, 'label')?.trim() ?? '';
    final value = optString(json, 'value')?.trim() ?? '';
    if (label.isEmpty || value.isEmpty) return null;
    return ProductSpec(key: optString(json, 'key'), label: label, value: value);
  }

  /// The specs in a JSON list, those that aren't one left out.
  static List<ProductSpec> listFrom(Object? value) => [
    if (value is List)
      for (final s in value)
        if (s is Map) ?ProductSpec.tryParse(asJson(s)),
  ];

  final String? key;
  final String label;
  final String value;
}

/// The value of a spec by key, or null.
String? specValue(List<ProductSpec>? specs, String key) {
  if (specs == null) return null;
  for (final s in specs) {
    if (s.key == key) return s.value;
  }
  return null;
}

/// The first number in a value ("650 W" → 650), as the server reads it.
double? specNumber(String? value) {
  if (value == null) return null;
  final m = RegExp(r'\d+(?:\.\d+)?').firstMatch(value.replaceAll(',', ''));
  return m == null ? null : double.tryParse(m.group(0)!);
}

/// Trade-in's grades, best first.
enum TradeInGrade { likeNew, good, fair, broken }

/// `StoreConfig.trade_in`: the devices the shop takes, each storage's top
/// price (a like-new one, in cents) and the share of it each grade gets.
class TradeInRules {
  const TradeInRules({required this.models, required this.grades});

  /// Null when it's off, or nothing in it can be offered.
  static TradeInRules? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final models = [
      for (final m
          in json['models'] is List ? json['models'] as List : const [])
        if (m is Map) ?TradeInModel.tryParse(asJson(m)),
    ];
    if (models.isEmpty) return null;
    final raw = json['grades'] is Map
        ? asJson(json['grades'])
        : const <String, Object?>{};
    const fallback = {
      TradeInGrade.likeNew: 100,
      TradeInGrade.good: 85,
      TradeInGrade.fair: 65,
      TradeInGrade.broken: 30,
    };
    return TradeInRules(
      models: models,
      grades: {
        for (final g in TradeInGrade.values)
          g: (optInt(raw, snake(g)) ?? fallback[g]!).clamp(0, 100),
      },
    );
  }

  final List<TradeInModel> models;
  final Map<TradeInGrade, int> grades;

  /// What a device is worth in cents: its storage's top price times its
  /// grade's share, to the whole unit below (the server's own sum).
  int? estimate(String model, String storage, TradeInGrade grade) {
    final m = models.where((x) => x.name == model).firstOrNull;
    final s = m?.storages.where((x) => x.label == storage).firstOrNull;
    if (s == null) return null;
    return estimateCents(s.cents, grades[grade] ?? 0);
  }

  /// The most any device gets (the "up to" of a trade-in card).
  int get top => models
      .expand((m) => m.storages)
      .fold(0, (best, s) => s.cents > best ? s.cents : best);
}

/// `floor(cents × share / 100)` to the whole unit below.
int estimateCents(int cents, int percent) =>
    (cents * percent ~/ 100) ~/ 100 * 100;

class TradeInModel {
  const TradeInModel({required this.name, required this.storages});

  static TradeInModel? tryParse(Json json) {
    final name = optString(json, 'name')?.trim() ?? '';
    final storages = [
      for (final s
          in json['storages'] is List ? json['storages'] as List : const [])
        if (s is Map &&
            (optString(asJson(s), 'label') ?? '').trim().isNotEmpty &&
            (optInt(asJson(s), 'cents') ?? 0) > 0)
          (
            label: optString(asJson(s), 'label')!.trim(),
            cents: optInt(asJson(s), 'cents')!,
          ),
    ];
    if (name.isEmpty || storages.isEmpty) return null;
    return TradeInModel(name: name, storages: storages);
  }

  final String name;
  final List<({String label, int cents})> storages;
}

/// The parts Build your PC is made of, in its order.
enum PcPart { cpu, board, ram, gpu, storage, cooler, psu, $case }

/// A part's wire name (`case` is a Dart word).
String pcPartWire(PcPart part) => part == PcPart.$case ? 'case' : part.name;

PcPart? pcPartFrom(Object? wire) {
  for (final p in PcPart.values) {
    if (pcPartWire(p) == wire) return p;
  }
  return null;
}

/// `StoreConfig.pc_builder`: a category of the shop for each part.
class PcBuilderRules {
  const PcBuilderRules({required this.steps});

  /// Null when it's off: at least a processor and a board, each once.
  static PcBuilderRules? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final seen = <PcPart>{};
    final steps = <PcBuildStep>[];
    for (final s in json['steps'] is List ? json['steps'] as List : const []) {
      if (s is! Map) continue;
      final step = asJson(s);
      final part = pcPartFrom(step['part']);
      final category = optInt(step, 'category_id');
      if (part == null || category == null || !seen.add(part)) continue;
      steps.add(
        PcBuildStep(
          part: part,
          categoryId: category,
          required: step['required'] != false,
        ),
      );
    }
    return steps.length >= 2 ? PcBuilderRules(steps: steps) : null;
  }

  final List<PcBuildStep> steps;
}

class PcBuildStep {
  const PcBuildStep({
    required this.part,
    required this.categoryId,
    required this.required,
  });

  final PcPart part;
  final int categoryId;
  final bool required;
}

/// Why a chosen part doesn't go with another.
enum BuildReason { socket, memory, power, size, cooler }

class BuildProblem {
  const BuildProblem(this.part, this.withPart, this.reason);

  final PcPart part;
  final PcPart withPart;
  final BuildReason reason;

  @override
  bool operator ==(Object other) =>
      other is BuildProblem &&
      other.part == part &&
      other.withPart == withPart &&
      other.reason == reason;

  @override
  int get hashCode => Object.hash(part, withPart, reason);

  @override
  String toString() => 'BuildProblem($part, $withPart, $reason)';
}

/// The power a build needs: the processor's and the graphics card's draw
/// and 100 W for the rest, a quarter more to spare, up to the next 50 W.
int buildWatts(Map<PcPart, List<ProductSpec>?> chosen) {
  final draw =
      (specNumber(specValue(chosen[PcPart.cpu], 'watts')) ?? 0) +
      (specNumber(specValue(chosen[PcPart.gpu], 'watts')) ?? 0) +
      100;
  return ((draw * 1.25) / 50).ceil() * 50;
}

/// A board's or case's size, 0 (Mini-ITX) to 3 (E-ATX); the largest named.
int? formRank(String? value) {
  if (value == null) return null;
  var v = value.toLowerCase().replaceAll(RegExp(r'[\s_]+'), '-');
  int? best;
  void take(RegExp re, int rank) {
    if (re.hasMatch(v)) {
      best = best == null || rank > best! ? rank : best;
      v = v.replaceAll(re, ' ');
    }
  }

  take(RegExp('e-?atx'), 3);
  take(RegExp('(micro-?atx|m-?atx)'), 1);
  take(RegExp('mini-?itx|(^|[^a-z])itx'), 0);
  take(RegExp('(^|[^a-z])atx'), 2);
  return best;
}

List<String> _sockets(String? v) => v == null
    ? const []
    : [
        for (final s in v.split(RegExp('[,/،]')))
          if (s.trim().isNotEmpty) s.trim().toLowerCase(),
      ];

/// The problems among the parts chosen so far; none: they go together.
List<BuildProblem> checkBuild(Map<PcPart, List<ProductSpec>?> chosen) {
  final out = <BuildProblem>[];
  String? v(PcPart part, String key) => specValue(chosen[part], key);
  final cpuSocket = v(PcPart.cpu, 'socket');
  final boardSocket = v(PcPart.board, 'socket');
  if (cpuSocket != null &&
      boardSocket != null &&
      !_sockets(boardSocket).contains(cpuSocket.trim().toLowerCase())) {
    out.add(const BuildProblem(PcPart.board, PcPart.cpu, BuildReason.socket));
  }
  final boardMemory = v(PcPart.board, 'memory_type');
  final ramMemory = v(PcPart.ram, 'memory_type');
  if (boardMemory != null &&
      ramMemory != null &&
      boardMemory.trim().toLowerCase() != ramMemory.trim().toLowerCase()) {
    out.add(const BuildProblem(PcPart.ram, PcPart.board, BuildReason.memory));
  }
  final coolerSockets = _sockets(v(PcPart.cooler, 'socket'));
  if (cpuSocket != null &&
      coolerSockets.isNotEmpty &&
      !coolerSockets.contains(cpuSocket.trim().toLowerCase())) {
    out.add(const BuildProblem(PcPart.cooler, PcPart.cpu, BuildReason.cooler));
  }
  final psu = specNumber(v(PcPart.psu, 'psu_watts'));
  if (psu != null &&
      (chosen[PcPart.cpu] != null || chosen[PcPart.gpu] != null) &&
      psu < buildWatts(chosen)) {
    out.add(
      BuildProblem(
        PcPart.psu,
        chosen[PcPart.gpu] != null ? PcPart.gpu : PcPart.cpu,
        BuildReason.power,
      ),
    );
  }
  final caseRank = formRank(v(PcPart.$case, 'form_factor'));
  final boardRank = formRank(v(PcPart.board, 'form_factor'));
  if (caseRank != null && boardRank != null && boardRank > caseRank) {
    out.add(const BuildProblem(PcPart.$case, PcPart.board, BuildReason.size));
  }
  return out;
}

/// `StudioNode.tech`: what a tech element shows.
enum StudioTradeInLook { card, full }

class StudioTech {
  const StudioTech({
    this.ids = const [],
    this.categoryId,
    this.rows,
    this.spec,
    this.look = StudioTradeInLook.card,
    this.accent,
  });

  static StudioTech tryParse(Object? value) {
    if (value is! Map) return const StudioTech();
    final json = asJson(value);
    return StudioTech(
      ids: stringList(json, 'ids'),
      categoryId: optString(json, 'category_id'),
      rows: optInt(json, 'rows'),
      spec: optString(json, 'spec'),
      look: enumFrom(
        StudioTradeInLook.values,
        json['look'],
        StudioTradeInLook.card,
      ),
      accent: optString(json, 'accent'),
    );
  }

  final List<String> ids;
  final String? categoryId;
  final int? rows;
  final String? spec;
  final StudioTradeInLook look;

  /// `#RRGGBB`; null: the app's main colour.
  final String? accent;
}

/// A product as a tech element gets it.
class TechProduct {
  const TechProduct({
    required this.id,
    required this.title,
    required this.price,
    this.imageUrl,
    this.wasPrice,
    this.specs = const [],
  });

  static TechProduct? tryParse(Json json) {
    final id = int.tryParse('${json['id'] ?? ''}');
    final title = optString(json, 'title');
    if (id == null || title == null) return null;
    return TechProduct(
      id: id,
      title: title,
      price: optString(json, 'price') ?? '',
      imageUrl: optString(json, 'image_url'),
      wasPrice: optString(json, 'was_price'),
      specs: ProductSpec.listFrom(json['specs']),
    );
  }

  final int id;
  final String title;
  final String? imageUrl;
  final String price;
  final String? wasPrice;
  final List<ProductSpec> specs;
}

/// `StudioNode.tech_served`: the element's products, or its spec's values.
class StudioTechServed {
  const StudioTechServed({this.products = const [], this.spec});

  static StudioTechServed? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final spec = json['spec'] is Map ? asJson(json['spec']) : null;
    final key = spec == null ? null : optString(spec, 'key');
    return StudioTechServed(
      products: [
        for (final p
            in json['products'] is List ? json['products'] as List : const [])
          if (p is Map) ?TechProduct.tryParse(asJson(p)),
      ],
      spec: spec == null || key == null
          ? null
          : (
              key: key,
              label: optString(spec, 'label') ?? key,
              values: [
                for (final v
                    in spec['values'] is List
                        ? spec['values'] as List
                        : const [])
                  if (v is Map &&
                      (optString(asJson(v), 'value') ?? '').isNotEmpty)
                    (
                      value: optString(asJson(v), 'value')!,
                      count: optInt(asJson(v), 'count') ?? 0,
                    ),
              ],
            ),
    );
  }

  final List<TechProduct> products;
  final ({String key, String label, List<({String value, int count})> values})?
  spec;
}

/// The compare table's rows: each spec label once, those every product
/// has first (in the first product's order), then the rest as they come;
/// each row a value per product, null where it has none.
List<({String label, List<String?> values})> compareRows(
  List<List<ProductSpec>> products,
) {
  String id(ProductSpec s) => s.key ?? s.label.trim().toLowerCase();
  final order = <String>[];
  final labels = <String, String>{};
  for (final specs in products) {
    for (final s in specs) {
      if (labels.containsKey(id(s))) continue;
      labels[id(s)] = s.label;
      order.add(id(s));
    }
  }
  String? valueOf(List<ProductSpec> specs, String key) {
    for (final s in specs) {
      if (id(s) == key) return s.value;
    }
    return null;
  }

  bool shared(String key) => products.every((p) => valueOf(p, key) != null);
  final sorted = [...order.where(shared), ...order.where((k) => !shared(k))];
  return [
    for (final k in sorted)
      (label: labels[k]!, values: [for (final p in products) valueOf(p, k)]),
  ];
}
