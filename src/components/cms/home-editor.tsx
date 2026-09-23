"use client";

import { LockedFooterNote } from "@/components/cms/locked-footer";
import type { HomeContent, HomeExpertiseItem } from "@/lib/cms/home";

export function HomeEditor({
  content,
  onChange,
}: {
  content: HomeContent;
  onChange: (next: HomeContent) => void;
}) {
  function patch(next: HomeContent) {
    onChange(next);
  }

  function updateItem(index: number, field: keyof HomeExpertiseItem, value: string) {
    patch({
      ...content,
      expertise: {
        ...content.expertise,
        items: content.expertise.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    });
  }

  return (
    <div className="admin-home-editor">
      <section className="admin-canvas">
        <h3>Hero</h3>
        <label>
          Rubrik
          <input
            value={content.hero.title}
            onChange={(event) =>
              patch({
                ...content,
                hero: { ...content.hero, title: event.target.value },
              })
            }
          />
        </label>
        <label>
          Primär knapp
          <input
            value={content.hero.primaryCta.label}
            onChange={(event) =>
              patch({
                ...content,
                hero: {
                  ...content.hero,
                  primaryCta: { ...content.hero.primaryCta, label: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Primär länk
          <input
            value={content.hero.primaryCta.href}
            onChange={(event) =>
              patch({
                ...content,
                hero: {
                  ...content.hero,
                  primaryCta: { ...content.hero.primaryCta, href: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Sekundär knapp
          <input
            value={content.hero.secondaryCta.label}
            onChange={(event) =>
              patch({
                ...content,
                hero: {
                  ...content.hero,
                  secondaryCta: { ...content.hero.secondaryCta, label: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Sekundär länk
          <input
            value={content.hero.secondaryCta.href}
            onChange={(event) =>
              patch({
                ...content,
                hero: {
                  ...content.hero,
                  secondaryCta: { ...content.hero.secondaryCta, href: event.target.value },
                },
              })
            }
          />
        </label>
      </section>

      <section className="admin-canvas">
        <h3>Ingress</h3>
        <label>
          Rubrik
          <textarea
            rows={4}
            value={content.intro.heading}
            onChange={(event) =>
              patch({
                ...content,
                intro: { ...content.intro, heading: event.target.value },
              })
            }
          />
        </label>
        <label>
          Text
          <textarea
            rows={6}
            value={content.intro.body}
            onChange={(event) =>
              patch({
                ...content,
                intro: { ...content.intro, body: event.target.value },
              })
            }
          />
        </label>
      </section>

      <section className="admin-canvas">
        <h3>Expertområden</h3>
        <label>
          Rubrik
          <input
            value={content.expertise.title}
            onChange={(event) =>
              patch({
                ...content,
                expertise: { ...content.expertise, title: event.target.value },
              })
            }
          />
        </label>
        {content.expertise.items.map((item, index) => (
          <div className="admin-home-item" key={index}>
            <p>Kort {index + 1}</p>
            <label>
              Namn
              <input
                value={item.title}
                onChange={(event) => updateItem(index, "title", event.target.value)}
              />
            </label>
            <label>
              Text
              <textarea
                rows={4}
                value={item.body}
                onChange={(event) => updateItem(index, "body", event.target.value)}
              />
            </label>
            <label>
              Länk
              <input
                value={item.href}
                onChange={(event) => updateItem(index, "href", event.target.value)}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="admin-canvas">
        <h3>Om oss</h3>
        <label>
          Rubrik
          <input
            value={content.about.title}
            onChange={(event) =>
              patch({
                ...content,
                about: { ...content.about, title: event.target.value },
              })
            }
          />
        </label>
        <label>
          Text
          <textarea
            rows={5}
            value={content.about.body}
            onChange={(event) =>
              patch({
                ...content,
                about: { ...content.about, body: event.target.value },
              })
            }
          />
        </label>
        <label>
          Knapp
          <input
            value={content.about.cta.label}
            onChange={(event) =>
              patch({
                ...content,
                about: {
                  ...content.about,
                  cta: { ...content.about.cta, label: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Länk
          <input
            value={content.about.cta.href}
            onChange={(event) =>
              patch({
                ...content,
                about: {
                  ...content.about,
                  cta: { ...content.about.cta, href: event.target.value },
                },
              })
            }
          />
        </label>
      </section>

      <section className="admin-canvas">
        <h3>Seminarium</h3>
        <label>
          Överrad
          <input
            value={content.seminar.kicker}
            onChange={(event) =>
              patch({
                ...content,
                seminar: { ...content.seminar, kicker: event.target.value },
              })
            }
          />
        </label>
        <label>
          Rubrik
          <input
            value={content.seminar.title}
            onChange={(event) =>
              patch({
                ...content,
                seminar: { ...content.seminar, title: event.target.value },
              })
            }
          />
        </label>
        <label>
          Knapp
          <input
            value={content.seminar.cta.label}
            onChange={(event) =>
              patch({
                ...content,
                seminar: {
                  ...content.seminar,
                  cta: { ...content.seminar.cta, label: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Länk
          <input
            value={content.seminar.cta.href}
            onChange={(event) =>
              patch({
                ...content,
                seminar: {
                  ...content.seminar,
                  cta: { ...content.seminar.cta, href: event.target.value },
                },
              })
            }
          />
        </label>
      </section>
      <LockedFooterNote />
    </div>
  );
}
