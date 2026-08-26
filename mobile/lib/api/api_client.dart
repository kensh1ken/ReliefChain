import 'package:dio/dio.dart';

import '../config/api_config.dart';
import 'api_exception.dart';

class ApiClient {
  final Dio _dio;
  String? _accessToken;

  ApiClient({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: ApiConfig.baseUrl,
              connectTimeout: ApiConfig.connectTimeout,
              receiveTimeout: ApiConfig.receiveTimeout,
              headers: const {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            ),
          ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  void close() {
    _dio.close(force: true);
  }

  Future<Map<String, dynamic>> getMap(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final data = await _send(
      () => _dio.get<dynamic>(path, queryParameters: queryParameters),
    );
    return _asMap(data);
  }

  Future<Map<String, dynamic>> postMap(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final data = await _send(() => _dio.post<dynamic>(path, data: body));
    return _asMap(data);
  }

  Future<void> postVoid(String path, {Map<String, dynamic>? body}) async {
    await _send(() => _dio.post<dynamic>(path, data: body));
  }

  Future<dynamic> _send(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      return response.data;
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw const ApiException('Unexpected API response format.');
  }

  ApiException _toApiException(DioException error) {
    final response = error.response;
    final data = response?.data;
    String message = error.message ?? 'Request failed.';

    if (data is Map) {
      final apiMessage = data['message'] ?? data['error'];
      if (apiMessage is String && apiMessage.isNotEmpty) {
        message = apiMessage;
      } else if (apiMessage is List) {
        message = apiMessage.join(', ');
      }
    }

    return ApiException(
      message,
      statusCode: response?.statusCode,
      details: data,
    );
  }
}
