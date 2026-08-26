import '../api/api_client.dart';
import '../api/api_routes.dart';
import '../models/beneficiary.dart';

class BeneficiaryRepository {
  final ApiClient _apiClient;

  const BeneficiaryRepository(this._apiClient);

  Future<Beneficiary> getMe() async {
    final json = await _apiClient.getMap(ApiRoutes.beneficiaryMe);
    return Beneficiary.fromJson(json);
  }
}
