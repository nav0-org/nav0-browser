# Privacy

Privacy isn't a feature in nav0—it's the foundation.

## Our Privacy Promise

**We collect nothing.**

That's not a simplified summary. That's the complete policy. nav0 does not collect, store, transmit, or process any user data. Period.

## What We Don't Collect

### Telemetry
- No usage statistics
- No crash reports sent to us
- No feature usage tracking
- No A/B testing data

### Personal Information
- No names
- No emails
- No accounts
- No identifiers

### Browsing Data
- No URLs visited
- No search queries
- No browsing history
- No bookmarks

### Device Information
- No hardware specs
- No OS details
- No screen resolution
- No installed software

### Network Data
- No IP addresses
- No location data
- No connection information
- No ISP details

## How We Achieve This

### No Accounts

Most data collection starts with "sign in." nav0 has no accounts, so there's nothing to sign into and no profile to build.

### No Cloud Services

Your data stays on your device:
- Bookmarks: local file
- History: local database
- Settings: local config
- Downloads: your chosen folder

### No Phone Home

nav0 makes no unsolicited network requests:
- No analytics pings
- No heartbeat checks
- No "anonymous" usage data
- No background sync

### Open Source

Don't trust us—verify:
- Full source code available
- Build it yourself
- Audit the network traffic
- We have nothing to hide

## Comparison

| Data Point | Other Browsers | nav0 |
|------------|----------------|------|
| Browsing history | Often synced/analyzed | Local only |
| Search queries | Logged by default | Never collected |
| Crash data | Sent automatically | Stays local |
| Usage patterns | Tracked for "improvement" | Not tracked |
| Device info | Collected for "compatibility" | Not collected |
| IP address | Logged on their servers | Never seen by us |

## Third-Party Concerns

### Search Engines

When you search, your query goes to your chosen search engine. We recommend privacy-respecting options:
- DuckDuckGo
- Startpage
- Brave Search

nav0 doesn't see or log what you search.

### Websites You Visit

Websites you visit can still:
- Set cookies (manageable in settings)
- Run JavaScript (controllable per-site)
- Track you through their own means

nav0 provides tools to limit this, but we can't control what websites do.

### Extensions

nav0 supports extensions. Third-party extensions may have their own privacy policies. We recommend:
- Reviewing extension permissions
- Using open-source extensions
- Limiting installed extensions

## Data Requests

### Law Enforcement

If law enforcement requests your data from us:

**We have nothing to provide.**

We don't have your data. We can't give what we don't have.

### Subpoenas

Same answer. We physically cannot comply with data requests because we don't collect data.

## Transparency

### No Privacy Policy Changes

We can't change our privacy policy to start collecting data without:
1. Changing the source code (visible to all)
2. Releasing a new version (you control updates)
3. Facing community backlash (we're open source)

### Verify Yourself

```bash
# Clone and audit
git clone https://github.com/nav0-org/nav0-browser.git

# Search for telemetry
grep -r "telemetry\|analytics\|tracking" src/

# Monitor network traffic
# Use Wireshark or similar to verify no unexpected connections
```

## Your Responsibilities

While nav0 protects your privacy from us, you should still:

- Use private browsing for sensitive activities
- Choose privacy-respecting search engines
- Be cautious with extensions
- Keep nav0 updated for security fixes
- Understand that websites can still track you

## Questions?

### "How do you improve the browser without telemetry?"

- Bug reports from users (voluntary)
- GitHub issues
- Community feedback
- Our own usage

### "How do you make money?"

nav0 is a community project. We don't monetize users.

### "What if you get acquired?"

The code is open source. Even if the project changes hands, the community can fork it. You can always build from a trusted commit.

---

**Bottom line**: Your browsing is your business. Not ours. Not anyone's.
