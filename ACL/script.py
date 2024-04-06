class SimpleACL:
    def __init__(self):
        # Define las reglas de la ACL aquí
        self.rules = [
            ("192.168.1.1", 80, "denegar"),#HTTP
            ("192.168.1.1", 443, "permitir"),#HTTPS
            ("192.168.1.3", 80, "denegar"),#HTTP
            ("192.168.1.3", 443, "permitir"),#HTTPS
            ("192.168.1.3", 465, "permitir"),#SMTPS
            ("192.168.1.2", None, "permitir"),  # None para el puerto significa cualquier puerto
        ]

    def check_access(self, ip, port):
        """Verifica el acceso basado en la IP y el puerto contra las reglas de la ACL."""
        for rule_ip, rule_port, action in self.rules:
            if ip == rule_ip and (port == rule_port or rule_port is None):
                return action
        return "denegar"  # Denegar el acceso por defecto si no coincide con ninguna regla

    def evaluate_requests(self, requests):
        """Evalúa una lista de solicitudes contra las reglas de la ACL."""
        for ip, port in requests:
            action = self.check_access(ip, port)
            print(f"Acceso desde {ip} a puerto {port} ha sido {action}.")

# Ejemplo de uso
acl = SimpleACL()
requests = [
    ("192.168.1.1", 80),
    ("192.168.1.2", 22),
    ("192.168.1.3", 80),
    ("192.168.1.3", 22),
    ("192.168.1.4", 101), # Esta IP no está definida en las reglas, por lo que se denegará por defecto
]
acl.evaluate_requests(requests)
