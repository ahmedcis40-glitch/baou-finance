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

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.role,
    required this.kycStatus,
    this.kycDocuments,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      phone: json['phone'],
      role: Role.values.firstWhere((e) => e.toString().split('.').last == json['role']),
      kycStatus: KYCStatus.values.firstWhere((e) => e.toString().split('.').last == json['kycStatus']),
      kycDocuments: json['kycDocuments'],
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
    };
  }
}
