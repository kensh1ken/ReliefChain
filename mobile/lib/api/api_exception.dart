class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Object? details;

  const ApiException(this.message, {this.statusCode, this.details});

  @override
  String toString() {
    if (statusCode == null) return message;
    return '$statusCode: $message';
  }
}
