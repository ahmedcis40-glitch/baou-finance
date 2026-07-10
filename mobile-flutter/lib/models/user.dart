enum KYCStatus {
  EN_ATTENTE_VALIDATION,
  APPROUVE,
  REJETE
}

enum Role {
  CLIENT,
  ADMIN_KYC,
  TRADER
}

class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final Role role;
  final KYCStatus kycStatus;
  final String? kycDocuments;
  final String? sgiPartenaire;
  final String? investorProfile;
  final String? investorHorizon;
  final String? investorObjective;
  final String? whatsappPhone;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.role,
    required this.kycStatus,
    this.kycDocuments,
    this.sgiPartenaire,
    this.investorProfile,
    this.investorHorizon,
    this.investorObjective,
    this.whatsappPhone,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    // Safe parsing of role enum
    Role parsedRole = Role.CLIENT;
    try {
      parsedRole = Role.values.firstWhere(
        (e) => e.toString().split('.').last == (json['role'] as String? ?? 'CLIENT'),
      );
    } catch (_) {}

    // Safe parsing of kycStatus enum
    KYCStatus parsedKyc = KYCStatus.EN_ATTENTE_VALIDATION;
    try {
      parsedKyc = KYCStatus.values.firstWhere(
        (e) => e.toString().split('.').last == (json['kycStatus'] as String? ?? 'EN_ATTENTE_VALIDATION'),
      );
    } catch (_) {}

    // kycDocuments peut être un Map ou une String selon le backend
    String? kycDocs;
    if (json['kycDocuments'] is String) {
      kycDocs = json['kycDocuments'] as String;
    } else if (json['kycDocuments'] != null) {
      kycDocs = json['kycDocuments'].toString();
    }

    return User(
      id: (json['id'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      firstName: (json['firstName'] as String?) ?? '',
      lastName: (json['lastName'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      role: parsedRole,
      kycStatus: parsedKyc,
      kycDocuments: kycDocs,
      sgiPartenaire: (json['sgiPartenaire'] as String?) ?? '',
      investorProfile: (json['investorProfile'] as String?) ?? 'MODERE',
      investorHorizon: (json['investorHorizon'] as String?) ?? 'MOYEN_TERME',
      investorObjective: (json['investorObjective'] as String?) ?? 'EPARGNE',
      whatsappPhone: (json['whatsappPhone'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'role': role.toString().split('.').last,
      'kycStatus': kycStatus.toString().split('.').last,
      'kycDocuments': kycDocuments,
      'sgiPartenaire': sgiPartenaire,
      'investorProfile': investorProfile,
      'investorHorizon': investorHorizon,
      'investorObjective': investorObjective,
      'whatsappPhone': whatsappPhone,
    };
  }
}
