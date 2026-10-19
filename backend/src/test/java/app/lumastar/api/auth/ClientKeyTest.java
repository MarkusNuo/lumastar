package app.lumastar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ClientKeyTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            203.0.113.7                              | 203.0.113.7
            2001:db8:85a3:8d3:1319:8a2e:370:7348     | 2001:db8:85a3:8d3::/64
            2001:0db8:85a3:08d3:ffff:ffff:ffff:ffff  | 2001:db8:85a3:8d3::/64
            2001:db8::1                              | 2001:db8:0:0::/64
            [2001:db8::1]                            | 2001:db8:0:0::/64
            fe80::1%eth0                             | fe80:0:0:0::/64
            0:0:0:0:0:0:0:1                          | 0:0:0:0::/64
            ::ffff:198.51.100.4                      | 198.51.100.4
            unknown:client                           | unknown:client
            """)
    void keysIpv4AddressesWholeAndIpv6AddressesByTheirSlash64Prefix(String remoteAddress, String key) {
        assertThat(ClientKey.of(remoteAddress)).isEqualTo(key);
    }
}
