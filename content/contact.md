---
title: "Contact"
description: "Get in touch for collaborations, consulting, or just to say hi."
---

## Let's Talk

I'm always interested in new projects, collaborations, or just chatting about Python and developer tools.

### Quick Options

&lt;div class="contact-options"&gt;
  &lt;a href="https://cal.com/tavallaie" class="contact-card" target="_blank" rel="noopener"&gt;
    &lt;div class="contact-icon"&gt;📅&lt;/div&gt;
    &lt;h3&gt;Book a Call&lt;/h3&gt;
    &lt;p&gt;Schedule a 30-min video call. Best for detailed discussions.&lt;/p&gt;
    &lt;span class="contact-action"&gt;Pick a time →&lt;/span&gt;
  &lt;/a&gt;
  &lt;a href="https://github.com/sponsors/tavallaie" class="contact-card" target="_blank" rel="noopener"&gt;
    &lt;div class="contact-icon"&gt;❤️&lt;/div&gt;
    &lt;h3&gt;Sponsor&lt;/h3&gt;
    &lt;p&gt;Support my open source work through GitHub Sponsors.&lt;/p&gt;
    &lt;span class="contact-action"&gt;Become a sponsor →&lt;/span&gt;
  &lt;/a&gt;
  &lt;a href="mailto:your-email@example.com" class="contact-card"&gt;
    &lt;div class="contact-icon"&gt;✉️&lt;/div&gt;
    &lt;h3&gt;Email&lt;/h3&gt;
    &lt;p&gt;For general inquiries and async communication.&lt;/p&gt;
    &lt;span class="contact-action"&gt;Send email →&lt;/span&gt;
  &lt;/a&gt;
&lt;/div&gt;

{{ if .Site.Params.formspreeId }}
### Or send a message directly

&lt;form action="https://formspree.io/f/{{ .Site.Params.formspreeId }}" method="POST" class="contact-form"&gt;
  &lt;div class="form-group"&gt;&lt;label for="name"&gt;Name&lt;/label&gt;&lt;input type="text" id="name" name="name" required&gt;&lt;/div&gt;
  &lt;div class="form-group"&gt;&lt;label for="email"&gt;Email&lt;/label&gt;&lt;input type="email" id="email" name="email" required&gt;&lt;/div&gt;
  &lt;div class="form-group"&gt;&lt;label for="subject"&gt;Subject&lt;/label&gt;
    &lt;select id="subject" name="subject"&gt;
      &lt;option value="consulting"&gt;Consulting/Project&lt;/option&gt;
      &lt;option value="collaboration"&gt;Collaboration&lt;/option&gt;
      &lt;option value="opensource"&gt;Open Source&lt;/option&gt;
      &lt;option value="other"&gt;Other&lt;/option&gt;
    &lt;/select&gt;
  &lt;/div&gt;
  &lt;div class="form-group"&gt;&lt;label for="message"&gt;Message&lt;/label&gt;&lt;textarea id="message" name="message" rows="5" required&gt;&lt;/textarea&gt;&lt;/div&gt;
  &lt;button type="submit" class="btn btn-primary"&gt;Send Message&lt;/button&gt;
&lt;/form&gt;
{{ else }}
&lt;p class="contact-note"&gt;💡 &lt;em&gt;Direct contact form coming soon. For now, please use the options above.&lt;/em&gt;&lt;/p&gt;
{{ end }}

### Social Links

- **GitHub (Personal):** [github.com/tavallaie](https://github.com/tavallaie)
- **GitHub (Org):** [github.com/techbend](https://github.com/techbend)
- **PyPI:** [pypi.org/user/tavallaie](https://pypi.org/user/tavallaie/)