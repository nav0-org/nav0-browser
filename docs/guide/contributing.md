---
title: "Contributing to nav0 Browser — Open Source Development Guide"
description: "How to contribute to nav0: report bugs, submit code, improve documentation, and help the community. Setup instructions, guidelines, and code of conduct."
---

# Contributing

nav0 is open source and welcomes contributions from the community.

## Ways to Contribute

### Use and Report

The simplest contribution:
- Use nav0 as your browser
- Report bugs when you find them
- Suggest improvements

### Code Contributions

Help build nav0:
- Fix bugs
- Improve performance
- Enhance security
- Write tests

### Documentation

Improve these docs:
- Fix typos and errors
- Clarify confusing sections
- Add missing information
- Translate to other languages

### Community

Help the community:
- Answer questions in issues
- Help triage bug reports
- Review pull requests
- Write tutorials

## Getting Started

### Prerequisites

- Node.js (LTS version)
- npm or yarn
- Git
- Basic knowledge of Electron and web technologies

### Setup

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/nav0-browser.git
cd nav0-browser

# Add upstream remote
git remote add upstream https://github.com/nav0-org/nav0-browser.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure

```
nav0-browser/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # Browser UI (renderer process)
│   ├── preload/        # Preload scripts
│   └── common/         # Shared utilities
├── docs/               # Documentation (VitePress)
├── tests/              # Test files
└── scripts/            # Build and utility scripts
```

## Contribution Guidelines

### Before You Start

1. **Check existing issues**: Your idea might already be discussed
2. **Open an issue first**: For significant changes, discuss before coding
3. **Stay focused**: One feature/fix per pull request

### Code Style

- Follow existing code patterns
- Use meaningful variable names
- Comment complex logic (but prefer clear code)
- No unnecessary dependencies

### Commit Messages

Use clear, descriptive commits:

```
Good:
- Fix tab close button not responding on hover
- Add keyboard shortcut for bookmark current page
- Update Electron to v28.0.0

Bad:
- Fixed stuff
- Updates
- WIP
```

### Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add tests if applicable
   - Update documentation if needed

3. **Test locally**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a PR on GitHub.

5. **Respond to feedback**
   - Address review comments
   - Make requested changes
   - Be patient and respectful

## What We Accept

### Yes

- Bug fixes
- Performance improvements
- Security enhancements
- Accessibility improvements
- Documentation improvements
- Test coverage increases
- Dependency updates (security/maintenance)

### Maybe (Discuss First)

- New features (must align with philosophy)
- UI/UX changes
- New dependencies
- Architecture changes

### No

- Telemetry or analytics
- Account systems
- Cloud sync features
- AI/ML features
- Cryptocurrency features
- Advertising-related code
- Tracking-related code

## Development Notes

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/specific-test.js

# Run with coverage
npm run test:coverage
```

### Building

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

### Documentation

```bash
# Start docs development server
npm run docs:dev

# Build documentation
npm run docs:build
```

## Code of Conduct

### Be Respectful

- Treat others as you want to be treated
- No harassment, discrimination, or personal attacks
- Assume good intentions
- Disagree constructively

### Be Constructive

- Focus on the code, not the person
- Provide actionable feedback
- Help others learn
- Celebrate contributions

### Be Patient

- Maintainers are volunteers
- Reviews take time
- Questions are welcome
- Everyone was a beginner once

## Recognition

Contributors are recognized in:
- Git history (your commits)
- GitHub contributors page
- Release notes (for significant contributions)

## Questions?

- **GitHub Issues**: For bugs and feature discussions
- **GitHub Discussions**: For general questions
- **Pull Request**: For code review

## License

By contributing to nav0, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make nav0 better. Every contribution matters.
