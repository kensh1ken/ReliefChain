import '../api/api_client.dart';
import '../api/api_routes.dart';
import '../models/beneficiary.dart';

class BeneficiaryRepository {
  final ApiClient _apiClient;

  BeneficiaryRepository(this._apiClient);

  Future<Beneficiary> getMe() async {
    final response = await _apiClient.getMap(
      ApiRoutes.beneficiaryMe,
    );

    return Beneficiary.fromJson(response);
  }
}