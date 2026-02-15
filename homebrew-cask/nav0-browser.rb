cask "nav0-browser" do
  version "0.1.0"

  on_arm do
    url "https://github.com/nav0-org/nav0-browser/releases/download/#{version}/nav0-browser-#{version}-arm64.dmg"
    sha256 :no_check
  end

  on_intel do
    url "https://github.com/nav0-org/nav0-browser/releases/download/#{version}/nav0-browser-#{version}-x64.dmg"
    sha256 :no_check
  end

  name "nav0 Browser"
  desc "Minimal, privacy-focused web browser built on Electron"
  homepage "https://github.com/nav0-org/nav0-browser"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "nav0-browser.app"

  zap trash: [
    "~/Library/Application Support/nav0-browser",
    "~/Library/Preferences/com.nav0.browser.plist",
    "~/Library/Caches/nav0-browser",
  ]
end
