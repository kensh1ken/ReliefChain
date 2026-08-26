import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/beneficiary_provider.dart';

class EligibilityScreen extends StatelessWidget {
  const EligibilityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<BeneficiaryProvider>(
      builder: (context, provider, _) {
        final beneficiary = provider.beneficiary;

        if (beneficiary == null) {
          return const Center(
            child: Text(
              'No eligibility information available.',
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Eligibility',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 20),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: Colors.green.shade600,
                          size: 28,
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'Eligible',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    Text(
                      'Scheme',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium,
                    ),

                    const SizedBox(height: 4),

                    Text(
                      beneficiary.schemeName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),

                    const SizedBox(height: 16),

                    Text(
                      'District',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium,
                    ),

                    const SizedBox(height: 4),

                    Text(beneficiary.districtCode),

                    const SizedBox(height: 16),

                    Text(
                      'Promised Aid',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium,
                    ),

                    const SizedBox(height: 4),

                    Text(
                      '₹${(beneficiary.promisedPaise / 100).toStringAsFixed(2)}',
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}