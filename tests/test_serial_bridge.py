import unittest

from tools.serial_bridge import parse_json_packet, parse_line


class SerialBridgeTests(unittest.TestCase):
    def test_parses_firmware_json_packet(self):
        line = (
            '[Packet] {"traceId":"TRUCK-001","latitude":"12.97","longitude":"77.59",'
            '"impact":2.5,"temperature":28.0,"humidity":55.0,"spoilageMinutes":999.0,'
            '"status":"NORMAL","prevHash":"genesis","currHash":"abc123"}'
        )

        packet = parse_json_packet(line)

        self.assertEqual(packet["traceId"], "TRUCK-001")
        self.assertEqual(packet["prevHash"], "genesis")
        self.assertEqual(packet["currHash"], "abc123")

    def test_parses_legacy_human_output_without_fabricating_hashes(self):
        packet = parse_line(
            "Location: SEARCHING, SEARCHING Temperature: 28.0 Humidity: 55.0 "
            "Impact: 2.5 Spoilage: 999.0 Status: NORMAL"
        )

        self.assertEqual(packet["temperature"], 28.0)
        self.assertIsNone(packet["prevHash"])
        self.assertIsNone(packet["currHash"])


if __name__ == "__main__":
    unittest.main()
